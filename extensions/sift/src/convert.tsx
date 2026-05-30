import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Icon,
  List,
  Toast,
  getPreferenceValues,
  open,
  showInFinder,
  showToast,
} from "@raycast/api";
import { useCachedState, useExec } from "@raycast/utils";
import { existsSync, statSync } from "fs";
import { readFile } from "fs/promises";
import { homedir } from "os";
import { basename, dirname, extname } from "path";
import { useCallback, useMemo, useState } from "react";
import {
  ConvertResult,
  Preferences,
  binaryExistsOrOnPath,
  resolveBinaryPath,
  resolveOutputPath,
  runMarkitdown,
} from "./utils";
import { useSpotlightSearch } from "./useSpotlightSearch";

const SUPPORTED_EXTS = new Set([
  "pdf",
  "doc",
  "docx",
  "ppt",
  "pptx",
  "xls",
  "xlsx",
  "html",
  "htm",
  "epub",
  "csv",
  "json",
  "xml",
  "wav",
  "mp3",
  "m4a",
  "msg",
  "jpg",
  "jpeg",
  "png",
  "tiff",
  "tif",
  "heic",
]);

const MAX_RESULTS = 50;
const RECENT_DAYS = 7;
const RECENT_CAP = 200;
const HISTORY_KEY = "conversion-history-v1";
const HISTORY_MAX = 20;

const SUPPORTED_EXTS_QUERY = Array.from(SUPPORTED_EXTS)
  .map((ext) => `kMDItemFSName == "*.${ext}"c`)
  .join(" || ");

const RECENT_QUERY = `kMDItemFSContentChangeDate >= $time.today(-${RECENT_DAYS}) && (${SUPPORTED_EXTS_QUERY})`;

const EXCLUDED_SEGMENTS = ["/Library/", "/.Trash/", "/node_modules/", "/.git/", "/.cache/", "/Caches/"];

type ConversionRecord = {
  source: string;
  output: string;
  convertedAt: number;
};

type FileEntry = {
  path: string;
  mtime: number;
  outputPath: string;
  alreadyConverted: boolean;
};

function getExt(path: string): string {
  return extname(path).replace(/^\./, "").toLowerCase();
}

function tildeify(path: string): string {
  const home = homedir();
  return path.startsWith(home) ? "~" + path.slice(home.length) : path;
}

function isExcluded(path: string): boolean {
  for (const seg of EXCLUDED_SEGMENTS) {
    if (path.includes(seg)) return true;
  }
  return false;
}

function formatTimeSince(ms: number): string {
  if (!ms) return "";
  const diff = Date.now() - ms;
  if (diff < 0) return "just now";
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function buildEntry(path: string, mtime: number, preferences: Preferences): FileEntry {
  const outputPath = resolveOutputPath(path, preferences);
  return { path, mtime, outputPath, alreadyConverted: existsSync(outputPath) };
}

function safeMtime(path: string): number {
  try {
    return statSync(path).mtimeMs;
  } catch {
    return 0;
  }
}

function approxTokens(path: string): string {
  try {
    const tokens = Math.round(statSync(path).size / 4);
    if (tokens >= 1000) return `~${(tokens / 1000).toFixed(1)}k tokens`;
    return `~${tokens} tokens`;
  } catch {
    return "";
  }
}

function FileEntryItem({
  entry,
  onConvert,
  onClearHistory,
  showClearHistory,
}: {
  entry: FileEntry;
  onConvert: (entry: FileEntry) => void;
  onClearHistory?: () => void;
  showClearHistory?: boolean;
}) {
  const ext = getExt(entry.path);
  const accessories: List.Item.Accessory[] = [];
  if (entry.alreadyConverted) {
    accessories.push({
      icon: { source: Icon.CheckCircle, tintColor: Color.Green },
      tooltip: "Markdown already exists",
    });
  }
  if (entry.mtime) {
    accessories.push({
      text: formatTimeSince(entry.mtime),
      tooltip: new Date(entry.mtime).toLocaleString(),
    });
  }
  accessories.push({ text: ext.toUpperCase() });

  return (
    <List.Item
      icon={{ fileIcon: entry.path }}
      title={basename(entry.path)}
      subtitle={tildeify(dirname(entry.path))}
      accessories={accessories}
      actions={
        <ActionPanel>
          {entry.alreadyConverted ? (
            <>
              <Action.Open title="Open Existing Markdown" target={entry.outputPath} icon={Icon.Document} />
              <Action
                title="Re-convert"
                icon={Icon.Wand}
                onAction={() => onConvert(entry)}
                shortcut={{ modifiers: ["cmd"], key: "return" }}
              />
            </>
          ) : (
            <Action title="Convert to Markdown" icon={Icon.Wand} onAction={() => onConvert(entry)} />
          )}
          <Action.Open title="Open Source File" target={entry.path} icon={Icon.Eye} />
          <Action.ShowInFinder path={entry.path} />
          <Action.CopyToClipboard
            title="Copy File Path"
            content={entry.path}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          {showClearHistory && onClearHistory ? (
            <Action
              title="Clear Recently Converted"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={onClearHistory}
              shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);
  const query = searchText.trim();
  const isSearching = query.length >= 2;

  const preferences = useMemo(() => getPreferenceValues<Preferences>(), []);
  const [history, setHistory] = useCachedState<ConversionRecord[]>(HISTORY_KEY, []);

  const addToHistory = useCallback(
    (source: string, output: string) => {
      setHistory((prev) =>
        [{ source, output, convertedAt: Date.now() }, ...prev.filter((r) => r.source !== source)].slice(0, HISTORY_MAX),
      );
    },
    [setHistory],
  );

  const clearHistory = useCallback(async () => {
    setHistory([]);
    await showToast({ style: Toast.Style.Success, title: "Cleared conversion history" });
  }, [setHistory]);

  const handleConvert = useCallback(
    async (entry: FileEntry) => {
      const result = await convertOne(entry.path, preferences);
      if (result?.ok) {
        addToHistory(entry.path, result.output);
        setRefreshTick((t) => t + 1);
      }
    },
    [preferences, addToHistory],
  );

  const { data: searchPaths, isLoading: isSearchLoading } = useSpotlightSearch(query, {
    execute: isSearching,
    maxResults: MAX_RESULTS,
  });

  const { isLoading: isRecentLoading, data: recentData } = useExec(
    "/bin/sh",
    ["-c", `mdfind -onlyin "$HOME" "$Q" | head -${RECENT_CAP}`],
    {
      env: { ...process.env, Q: RECENT_QUERY },
      execute: !isSearching,
      keepPreviousData: true,
    },
  );

  const historyEntries: FileEntry[] = useMemo(() => {
    void refreshTick;
    return history
      .filter((r) => existsSync(r.source))
      .map((r) => ({
        path: r.source,
        mtime: r.convertedAt,
        outputPath: r.output,
        alreadyConverted: existsSync(r.output),
      }));
  }, [history, refreshTick]);

  const searchEntries: FileEntry[] = useMemo(() => {
    void refreshTick;
    if (searchPaths.length === 0) return [];
    const seen = new Set<string>();
    const out: FileEntry[] = [];
    for (const path of searchPaths) {
      if (!path || seen.has(path)) continue;
      if (isExcluded(path)) continue;
      if (!SUPPORTED_EXTS.has(getExt(path))) continue;
      seen.add(path);
      out.push(buildEntry(path, safeMtime(path), preferences));
      if (out.length >= MAX_RESULTS) break;
    }
    return out.sort((a, b) => b.mtime - a.mtime);
  }, [searchPaths, preferences, refreshTick]);

  const recentEntries: FileEntry[] = useMemo(() => {
    void refreshTick;
    if (!recentData) return [];
    const seen = new Set<string>();
    const stamped: { path: string; mtime: number }[] = [];
    for (const line of recentData.toString().split("\n")) {
      const path = line.trim();
      if (!path || seen.has(path)) continue;
      if (isExcluded(path)) continue;
      if (!SUPPORTED_EXTS.has(getExt(path))) continue;
      seen.add(path);
      const mtime = safeMtime(path);
      if (mtime > 0) stamped.push({ path, mtime });
    }
    return stamped
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, 20)
      .map(({ path, mtime }) => buildEntry(path, mtime, preferences));
  }, [recentData, preferences, refreshTick]);

  const historyPathSet = useMemo(() => new Set(historyEntries.map((e) => e.path)), [historyEntries]);
  const dedupedRecent = useMemo(
    () => recentEntries.filter((e) => !historyPathSet.has(e.path)),
    [recentEntries, historyPathSet],
  );

  const showLoading = isSearching ? isSearchLoading : isRecentLoading;

  return (
    <List
      isLoading={showLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search by filename, or pick a recent file…"
      throttle
    >
      {isSearching ? (
        searchEntries.length === 0 ? (
          isSearchLoading ? (
            <List.EmptyView icon={Icon.MagnifyingGlass} title="Searching…" />
          ) : (
            <List.EmptyView
              icon={Icon.QuestionMark}
              title="No matching documents"
              description={`Nothing found for "${query}". Try a different word or partial filename.`}
            />
          )
        ) : (
          <List.Section title={`Results for "${query}"`} subtitle={`${searchEntries.length}`}>
            {searchEntries.map((entry) => (
              <FileEntryItem key={entry.path} entry={entry} onConvert={handleConvert} />
            ))}
          </List.Section>
        )
      ) : historyEntries.length === 0 && dedupedRecent.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No recent documents"
          description="Start typing to search your whole Mac via Spotlight."
        />
      ) : (
        <>
          {historyEntries.length > 0 ? (
            <List.Section title="Recently Converted" subtitle={`${historyEntries.length}`}>
              {historyEntries.map((entry) => (
                <FileEntryItem
                  key={`hist:${entry.path}`}
                  entry={entry}
                  onConvert={handleConvert}
                  onClearHistory={clearHistory}
                  showClearHistory
                />
              ))}
            </List.Section>
          ) : null}
          {dedupedRecent.length > 0 ? (
            <List.Section title="Recent" subtitle={`Last ${RECENT_DAYS} days`}>
              {dedupedRecent.map((entry) => (
                <FileEntryItem key={`recent:${entry.path}`} entry={entry} onConvert={handleConvert} />
              ))}
            </List.Section>
          ) : null}
        </>
      )}
    </List>
  );
}

async function convertOne(path: string, preferences: Preferences): Promise<ConvertResult | null> {
  const binary = resolveBinaryPath(preferences);

  if (!binaryExistsOrOnPath(binary)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "MarkItDown not found",
      message: "Install with: uv tool install 'markitdown[all]'",
    });
    return null;
  }

  await showToast({
    style: Toast.Style.Animated,
    title: `Converting ${basename(path)}…`,
  });

  const output = resolveOutputPath(path, preferences);
  const result = await runMarkitdown(path, output, binary);

  if (!result.ok) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Conversion failed",
      message: result.error ?? "Unknown error",
    });
    return result;
  }

  if (preferences.copyToClipboard) {
    try {
      const content = await readFile(result.output, "utf-8");
      await Clipboard.copy(content);
    } catch {
      // non-fatal
    }
  }

  if (preferences.openAfterConvert) {
    await open(result.output);
  }

  const tokens = approxTokens(result.output);
  await showToast({
    style: Toast.Style.Success,
    title: `Converted ${basename(result.source)}`,
    message: tokens ? `→ ${basename(result.output)} · ${tokens}` : `→ ${basename(result.output)}`,
    primaryAction: {
      title: "Show in Finder",
      onAction: async (toast) => {
        await showInFinder(result.output);
        await toast.hide();
      },
    },
    secondaryAction: {
      title: "Open Markdown",
      onAction: async (toast) => {
        await open(result.output);
        await toast.hide();
      },
    },
  });

  return result;
}
