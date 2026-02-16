import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  List,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import fs from "fs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  resolveOptionalPath,
  resolvePetConfigPath,
  resolveSnippetFilePath,
} from "./lib/path";
import { loadPetSnippetsFromCli } from "./lib/pet-cli";
import { parsePetSnippets, PetSnippet } from "./lib/pet";
import { filterAndSortSnippets } from "./lib/search";
import {
  loadLastUsedMap,
  saveLastUsedMap,
  type LastUsedMap,
} from "./lib/usage";

const FILE_WATCH_POLL_INTERVAL_MS = 2000;
const CLI_POLL_INTERVAL_MS = 5000;

interface Preferences {
  sourceMode?: "pet-cli" | "snippet-file";
  petConfigPath?: string;
  petBinaryPath?: string;
  snippetFilePath?: string;
  defaultAction?: "copy" | "paste";
  commandDisplay?: "detail" | "title-only" | "subtitle";
  lastUsedDisplay?: "off" | "relative" | "absolute";
}

const absoluteTimeFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatLastUsed(
  timestamp: number | undefined,
  mode: "off" | "relative" | "absolute",
): string | undefined {
  if (!timestamp || mode === "off") {
    return undefined;
  }

  if (mode === "absolute") {
    return absoluteTimeFormatter.format(new Date(timestamp));
  }

  const diff = Date.now() - timestamp;
  if (diff < 60_000) {
    return "just now";
  }
  if (diff < 3_600_000) {
    return `${Math.floor(diff / 60_000)}m ago`;
  }
  if (diff < 86_400_000) {
    return `${Math.floor(diff / 3_600_000)}h ago`;
  }
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1)}…`;
}

function formatTagAccessory(tags: string[]): string {
  if (tags.length <= 2) {
    return tags.map((tag) => `#${tag}`).join(" ");
  }
  return `${tags
    .slice(0, 2)
    .map((tag) => `#${tag}`)
    .join(" ")} +${tags.length - 2}`;
}

function snippetMarkdown(snippet: PetSnippet): string {
  const lines = [
    `# ${snippet.description}`,
    "",
    "```sh",
    snippet.command,
    "```",
  ];

  if (snippet.tags.length > 0) {
    lines.push(
      "",
      `Tags: ${snippet.tags.map((tag) => `\`${tag}\``).join(" ")}`,
    );
  }

  if (snippet.output) {
    lines.push("", "Output:", "", "```txt", snippet.output, "```");
  }

  return lines.join("\n");
}

function MissingFileHint({ path }: { path: string }) {
  return (
    <Detail
      markdown={`# Snippet file not found

Expected file:
\`${path}\`

Create it with:
\`\`\`bash
pet edit
\`\`\`
`}
    />
  );
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const sourceMode =
    prefs.sourceMode === "snippet-file" ? "snippet-file" : "pet-cli";
  const petConfigPath = useMemo(
    () => resolvePetConfigPath(prefs.petConfigPath),
    [prefs.petConfigPath],
  );
  const petBinaryPath = useMemo(
    () => resolveOptionalPath(prefs.petBinaryPath),
    [prefs.petBinaryPath],
  );
  const snippetFilePath = useMemo(
    () => resolveSnippetFilePath(prefs.snippetFilePath),
    [prefs.snippetFilePath],
  );
  const defaultAction = prefs.defaultAction === "paste" ? "paste" : "copy";
  const commandDisplay =
    prefs.commandDisplay === "subtitle" || prefs.commandDisplay === "title-only"
      ? prefs.commandDisplay
      : "detail";
  const lastUsedDisplay =
    prefs.lastUsedDisplay === "relative" || prefs.lastUsedDisplay === "absolute"
      ? prefs.lastUsedDisplay
      : "off";

  const [searchText, setSearchText] = useState("");
  const [snippets, setSnippets] = useState<PetSnippet[]>([]);
  const [lastUsedMap, setLastUsedMap] = useState<LastUsedMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const mtimeRef = useRef<number | undefined>(undefined);
  const snapshotRef = useRef<string | undefined>(undefined);
  const loadingRef = useRef(false);

  useEffect(() => {
    void loadLastUsedMap().then(setLastUsedMap);
  }, []);

  const loadSnippets = useCallback(
    async (showSuccessToast: boolean) => {
      if (loadingRef.current) {
        return;
      }
      loadingRef.current = true;
      setIsLoading(true);

      try {
        let parsed: PetSnippet[];
        if (sourceMode === "pet-cli") {
          const result = loadPetSnippetsFromCli(petConfigPath, petBinaryPath);
          parsed = result.snippets;
          snapshotRef.current = result.snapshot;
          mtimeRef.current = undefined;
        } else {
          const stat = fs.statSync(snippetFilePath);
          if (!stat.isFile()) {
            throw new Error("Configured path is not a file.");
          }

          const content = fs.readFileSync(snippetFilePath, "utf8");
          parsed = parsePetSnippets(content);
          mtimeRef.current = stat.mtimeMs;
          snapshotRef.current = undefined;
        }

        setSnippets(parsed);
        setError(undefined);

        if (showSuccessToast) {
          await showToast({
            style: Toast.Style.Success,
            title: "Snippets reloaded",
            message: `Loaded ${parsed.length} snippet${parsed.length === 1 ? "" : "s"}`,
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const sourceHint =
          sourceMode === "pet-cli"
            ? `pet list (binary: ${petBinaryPath ?? "auto"}, config: ${petConfigPath})`
            : snippetFilePath;
        const fullMessage = `Unable to load snippets from ${sourceHint}. ${message}`;
        setError(fullMessage);
        setSnippets([]);
        snapshotRef.current = undefined;

        if (showSuccessToast) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to reload snippets",
            message: message,
          });
        }
      } finally {
        loadingRef.current = false;
        setIsLoading(false);
      }
    },
    [petBinaryPath, petConfigPath, snippetFilePath, sourceMode],
  );

  useEffect(() => {
    void loadSnippets(false);
  }, [loadSnippets]);

  useEffect(() => {
    const timer = setInterval(
      () => {
        if (sourceMode === "pet-cli") {
          try {
            const result = loadPetSnippetsFromCli(petConfigPath, petBinaryPath);
            if (result.snapshot !== snapshotRef.current) {
              snapshotRef.current = result.snapshot;
              setSnippets(result.snippets);
              setError(undefined);
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            setError(
              `Unable to refresh snippets via pet CLI (binary: ${petBinaryPath ?? "auto"}, config: ${petConfigPath}). ${message}`,
            );
          }
          return;
        }

        try {
          const stat = fs.statSync(snippetFilePath);
          if (!stat.isFile()) {
            return;
          }

          if (
            mtimeRef.current === undefined ||
            stat.mtimeMs !== mtimeRef.current
          ) {
            void loadSnippets(false);
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          setError(
            `Unable to watch snippet file ${snippetFilePath}. ${message}`,
          );
        }
      },
      sourceMode === "pet-cli"
        ? CLI_POLL_INTERVAL_MS
        : FILE_WATCH_POLL_INTERVAL_MS,
    );

    return () => clearInterval(timer);
  }, [loadSnippets, petBinaryPath, petConfigPath, snippetFilePath, sourceMode]);

  const filteredSnippets = useMemo(
    () => filterAndSortSnippets(snippets, searchText, lastUsedMap),
    [lastUsedMap, searchText, snippets],
  );

  const markSnippetUsed = useCallback((snippetId: string) => {
    setLastUsedMap((current) => {
      const next = { ...current, [snippetId]: Date.now() };
      void saveLastUsedMap(next);
      return next;
    });
  }, []);

  const emptyTitle = error ? "Cannot load snippets" : "No snippets found";
  const emptyDescription =
    error ??
    (sourceMode === "pet-cli"
      ? "Add snippets with `pet new` or `pet edit`, then ensure `pet list` works."
      : "Add snippets with `pet new` or `pet edit` and reload.");

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search snippets (use tag:<name> to filter by tag)"
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
      isShowingDetail={commandDisplay === "detail"}
    >
      {error ? (
        <List.EmptyView
          title={emptyTitle}
          description={emptyDescription}
          icon={Icon.Warning}
        />
      ) : null}
      {!error && filteredSnippets.length === 0 ? (
        <List.EmptyView
          title={emptyTitle}
          description={emptyDescription}
          icon={Icon.MagnifyingGlass}
        />
      ) : null}

      {filteredSnippets.map((snippet) => {
        const lastUsed = lastUsedMap[snippet.id];
        const lastUsedText = formatLastUsed(lastUsed, lastUsedDisplay);
        const accessories: List.Item.Accessory[] = [];
        if (snippet.tags.length > 0) {
          accessories.push({
            text: formatTagAccessory(snippet.tags),
            tooltip: snippet.tags.map((tag) => `#${tag}`).join(" "),
          });
        }
        if (lastUsedText) {
          accessories.push({
            text: lastUsedText,
            tooltip: lastUsed ? new Date(lastUsed).toLocaleString() : undefined,
            icon: lastUsedDisplay === "relative" ? Icon.Clock : undefined,
          });
        }

        const copyAction = (
          <Action.CopyToClipboard
            title="Copy Snippet"
            content={snippet.command}
            onCopy={() => markSnippetUsed(snippet.id)}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        );

        const pasteAction = (
          <Action.Paste
            title="Paste Snippet"
            content={snippet.command}
            onPaste={() => markSnippetUsed(snippet.id)}
            shortcut={{ modifiers: ["cmd"], key: "v" }}
          />
        );

        return (
          <List.Item
            key={snippet.id}
            title={snippet.description}
            subtitle={
              commandDisplay === "subtitle"
                ? truncateText(snippet.command, 96)
                : undefined
            }
            detail={
              commandDisplay === "detail" ? (
                <List.Item.Detail markdown={snippetMarkdown(snippet)} />
              ) : undefined
            }
            accessories={accessories}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  {defaultAction === "copy" ? (
                    <>
                      {copyAction}
                      {pasteAction}
                    </>
                  ) : (
                    <>
                      {pasteAction}
                      {copyAction}
                    </>
                  )}
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.Push
                    title="Show Raw Snippet"
                    icon={Icon.Text}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                    target={<Detail markdown={snippetMarkdown(snippet)} />}
                  />
                  <Action.CopyToClipboard
                    title="Copy Description"
                    content={snippet.description}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Reload Snippets"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={() => void loadSnippets(true)}
                  />
                  <Action.Open
                    title={
                      sourceMode === "pet-cli"
                        ? "Open Pet Config File"
                        : "Open Snippet File"
                    }
                    target={
                      sourceMode === "pet-cli" ? petConfigPath : snippetFilePath
                    }
                    icon={Icon.Document}
                  />
                  <Action
                    title="Open Extension Preferences"
                    icon={Icon.Gear}
                    onAction={openExtensionPreferences}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}

      {sourceMode === "snippet-file" &&
      (error?.toLowerCase().includes("no such file") ||
        error?.toLowerCase().includes("enoent")) ? (
        <List.Item
          title="Create Pet Snippet File"
          subtitle={snippetFilePath}
          icon={Icon.PlusCircle}
          actions={
            <ActionPanel>
              <Action.Push
                title="How to Create It"
                target={<MissingFileHint path={snippetFilePath} />}
              />
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      ) : null}
    </List>
  );
}
