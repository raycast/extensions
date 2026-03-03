import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Icon,
  List,
  Toast,
  getPreferenceValues,
  showHUD,
  showToast,
} from "@raycast/api";
import { useExec, useLocalStorage } from "@raycast/utils";
import { useCallback, useRef } from "react";

function expandTilde(p: string): string {
  if (p.startsWith("~/")) return `${process.env.HOME}${p.slice(1)}`;
  return p;
}

export function getCliPath(): string {
  const { cliPath } = getPreferenceValues();
  return expandTilde(cliPath || "~/.local/bin/apple-loc");
}

export function getDbPath(): string {
  const { dbPath } = getPreferenceValues();
  return expandTilde(dbPath || "~/.apple-loc/apple-loc.db");
}

export function isFuzzyEnabled(): boolean {
  return getPreferenceValues().fuzzy;
}

export function getResultLimit(): number | undefined {
  const { resultLimit } = getPreferenceValues();
  if (!resultLimit) return undefined;
  const n = parseInt(resultLimit, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export interface CLIInfo {
  platforms: string[];
  languages: string[];
}

function formatCliError(err: Error, cliPath: string, dbPath: string): string {
  if (err.message.includes("ENOENT")) return `CLI not found at ${cliPath}`;
  if (err.message.includes("no such table")) return `Invalid database at ${dbPath}`;
  return err.message;
}

export function cliErrorHandler(cliPath: string, dbPath: string) {
  return (err: Error) => {
    showToast({
      style: Toast.Style.Failure,
      title: "apple-loc failed",
      message: formatCliError(err, cliPath, dbPath),
    });
  };
}

export function useInfo(): { info: CLIInfo | undefined; isLoading: boolean } {
  const cliPath = getCliPath();
  const dbPath = getDbPath();
  const { data, isLoading } = useExec(cliPath, ["info", "--db", dbPath], {
    parseOutput: ({ stdout }) => {
      const parsed = JSON.parse(stdout);
      if (parsed.error === "no_database") {
        throw new Error(`Database not found at ${dbPath}`);
      }
      if (parsed.error) {
        throw new Error(parsed.error);
      }
      return parsed as CLIInfo;
    },
    onError: cliErrorHandler(cliPath, dbPath),
  });
  return { info: data, isLoading };
}

export function formatPlatformLabel(raw: string): string {
  const m = raw.match(/^(macos|ios)(\d+)$/);
  if (!m) return raw;
  const name = m[1] === "macos" ? "macOS" : "iOS";
  return `${name} ${m[2]}`;
}

export function PlatformDropdown({
  info,
  isLoading,
  onChange,
}: {
  info: CLIInfo | undefined;
  isLoading: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <List.Dropdown tooltip="Platform" onChange={onChange} isLoading={isLoading} storeValue>
      <List.Dropdown.Item title="All Platforms" value="" />
      {(info?.platforms ?? []).map((p) => (
        <List.Dropdown.Item key={p} title={formatPlatformLabel(p)} value={p} />
      ))}
    </List.Dropdown>
  );
}

export type TranslationValue = string | Record<string, unknown>;

export interface LocalizationResult {
  bundle_name: string;
  bundles: string[];
  distance: number;
  file_name: string;
  platform: string;
  source: string;
  translations: Record<string, TranslationValue>;
}

export interface CLIOutput {
  results: LocalizationResult[];
}

export function buildArgs(opts: { db: string; platform?: string; langs?: string[] }): string[] {
  const limit = getResultLimit();
  const args: string[] = [...(limit ? ["--limit", String(limit)] : []), "--db", opts.db];
  if (opts.platform) args.push("--platform", opts.platform);
  if (opts.langs?.length) args.push("--lang", opts.langs.join(","));
  return args;
}

export function parseCLIOutput(stdout: string): LocalizationResult[] {
  if (!stdout.trim()) return [];
  const parsed = JSON.parse(stdout) as CLIOutput;
  return parsed.results;
}

const HISTORY_MAX = 20;

export interface HistoryEntry {
  id: string; // "platform:bundle_name:source"
  result: LocalizationResult;
  accessedAt: string;
}

function makeHistoryId(r: LocalizationResult): string {
  return `${r.platform}:${r.bundle_name}:${r.source}`;
}

export function useHistory() {
  const { value: history = [], setValue, isLoading } = useLocalStorage<HistoryEntry[]>("history", []);
  const historyRef = useRef(history);
  historyRef.current = history;

  const addToHistory = useCallback(
    async (result: LocalizationResult) => {
      const id = makeHistoryId(result);
      const entry: HistoryEntry = { id, result, accessedAt: new Date().toISOString() };
      const filtered = historyRef.current.filter((e) => e.id !== id);
      await setValue([entry, ...filtered].slice(0, HISTORY_MAX));
    },
    [setValue],
  );

  const removeFromHistory = useCallback(
    async (result: LocalizationResult) => {
      const id = makeHistoryId(result);
      await setValue(historyRef.current.filter((e) => e.id !== id));
    },
    [setValue],
  );

  return { history, addToHistory, removeFromHistory, isLoading };
}

function isStructuredTarget(value: TranslationValue): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

interface StructuredGroup {
  title: string;
  entries: [string, string][];
}

function formatStructuredTarget(obj: Record<string, unknown>): { groups: StructuredGroup[] } {
  const groups: StructuredGroup[] = [];
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === "object" && val !== null) {
      const entries: [string, string][] = [];
      for (const [subKey, subVal] of Object.entries(val as Record<string, unknown>)) {
        if (subKey.startsWith("NSString")) continue;
        entries.push([subKey, typeof subVal === "object" ? JSON.stringify(subVal) : String(subVal)]);
      }
      if (entries.length > 0) {
        groups.push({ title: key, entries });
      }
    } else if (!key.startsWith("NSString")) {
      groups.push({ title: key, entries: [["", String(val)]] });
    }
  }
  // Fallback: if all entries were Apple metadata, include everything unfiltered
  if (groups.length === 0) {
    for (const [key, val] of Object.entries(obj)) {
      groups.push({
        title: key,
        entries: [["", typeof val === "object" ? JSON.stringify(val) : String(val)]],
      });
    }
  }
  return { groups };
}

function getDeviceTagColor(
  platform: string,
  groupTitle: string,
  variant: string,
  allVariants: string[],
): Color | undefined {
  if (groupTitle !== "NSStringDeviceSpecificRuleType") return undefined;
  if (!platform) return undefined;

  const isMac = platform.startsWith("macos");
  const isIOS = platform.startsWith("ios");
  if (!isMac && !isIOS) return undefined;

  // Explicit device key — direct match (relevant = undefined to match default appearance)
  if (variant !== "other") {
    if (isMac) return variant === "mac" ? undefined : Color.SecondaryText;
    return variant === "iphone" || variant === "ipad" || variant === "ipod" ? undefined : Color.SecondaryText;
  }

  // variant === "other": fallback covers this platform only when no explicit key exists
  if (isMac) return allVariants.includes("mac") ? Color.SecondaryText : undefined;
  return allVariants.some((v) => v === "iphone" || v === "ipad" || v === "ipod") ? Color.SecondaryText : undefined;
}

export function ResultListItem({
  result,
  platform,
  langs,
  languages,
  onLangToggle,
  onLangClear,
  onAction,
  onRemoveFromHistory,
}: {
  result: LocalizationResult;
  platform: string;
  langs: string[];
  languages: string[];
  onLangToggle: (lang: string) => void;
  onLangClear: () => void;
  onAction?: (result: LocalizationResult) => void;
  onRemoveFromHistory?: (result: LocalizationResult) => void;
}) {
  const sortedLangs = Object.keys(result.translations).sort();
  const structured = new Map<string, { groups: StructuredGroup[] }>();
  for (const lang of sortedLangs) {
    const value = result.translations[lang];
    if (isStructuredTarget(value)) {
      structured.set(lang, formatStructuredTarget(value));
    }
  }

  return (
    <List.Item
      title={result.source}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              {sortedLangs.flatMap((lang) => {
                const fmt = structured.get(lang);
                if (fmt) {
                  return [
                    <List.Item.Detail.Metadata.Label key={lang} title={lang} />,
                    ...fmt.groups.flatMap((group) =>
                      group.entries.map(([variant, text]) => {
                        const title = variant ? `  ${group.title}.${variant}` : `  ${group.title}`;
                        return (
                          <List.Item.Detail.Metadata.TagList key={`${lang}:${group.title}:${variant}`} title={title}>
                            <List.Item.Detail.Metadata.TagList.Item
                              text={text}
                              color={getDeviceTagColor(
                                platform,
                                group.title,
                                variant,
                                group.entries.map(([v]) => v),
                              )}
                              onAction={async () => {
                                await Clipboard.copy(text);
                                await showHUD(`Copied ${lang} → ${variant || group.title}`);
                                onAction?.(result);
                              }}
                            />
                          </List.Item.Detail.Metadata.TagList>
                        );
                      }),
                    ),
                  ];
                }
                const text = result.translations[lang] as string;
                return (
                  <List.Item.Detail.Metadata.TagList key={lang} title={lang}>
                    <List.Item.Detail.Metadata.TagList.Item
                      text={text}
                      onAction={async () => {
                        await Clipboard.copy(text);
                        await showHUD(`Copied ${lang} translation`);
                        onAction?.(result);
                      }}
                    />
                  </List.Item.Detail.Metadata.TagList>
                );
              })}
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Platform" text={formatPlatformLabel(result.platform)} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.TagList title="Bundles">
                {result.bundles.map((b) => (
                  <List.Item.Detail.Metadata.TagList.Item
                    key={b}
                    text={b}
                    onAction={async () => {
                      await Clipboard.copy(b);
                      await showHUD(`Copied "${b}"`);
                      onAction?.(result);
                    }}
                  />
                ))}
              </List.Item.Detail.Metadata.TagList>
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Source Key" content={result.source} onCopy={() => onAction?.(result)} />
          <Action.Paste title="Paste Source Key" content={result.source} onPaste={() => onAction?.(result)} />
          <ActionPanel.Submenu title="Copy Translation…" shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}>
            {sortedLangs.flatMap((lang) => {
              const fmt = structured.get(lang);
              if (fmt) {
                return fmt.groups.flatMap((group) =>
                  group.entries.map(([variant, text]) => {
                    const label = variant || group.title;
                    return (
                      <Action.CopyToClipboard
                        key={`${lang}:${group.title}:${label}`}
                        title={`${lang} [${label}]: ${text}`}
                        content={text}
                        onCopy={() => onAction?.(result)}
                      />
                    );
                  }),
                );
              }
              return (
                <Action.CopyToClipboard
                  key={lang}
                  title={`${lang}: ${result.translations[lang] as string}`}
                  content={result.translations[lang] as string}
                  onCopy={() => onAction?.(result)}
                />
              );
            })}
          </ActionPanel.Submenu>
          <ActionPanel.Submenu title="Filter by Language" shortcut={{ modifiers: ["cmd"], key: "l" }}>
            {languages.map((l) => (
              <Action
                key={l}
                title={l}
                icon={langs.includes(l) ? Icon.Checkmark : Icon.Circle}
                onAction={() => onLangToggle(l)}
              />
            ))}
          </ActionPanel.Submenu>
          {langs.length > 0 && (
            <Action
              title="Clear Language Filter"
              onAction={onLangClear}
              shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
            />
          )}
          {onRemoveFromHistory && (
            <Action
              title="Remove from History"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={() => onRemoveFromHistory(result)}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
