import {
  Action,
  ActionPanel,
  List,
  Icon,
  Keyboard,
  Clipboard,
  LocalStorage,
  showToast,
  Toast,
  open,
  showInFinder,
} from "@raycast/api";
import { useState, useMemo, useEffect, useRef } from "react";
import {
  existsSync,
  mkdirSync,
  openSync,
  readSync,
  closeSync,
  renameSync,
} from "fs";
import { createHash } from "crypto";
import { execFile, ChildProcess } from "child_process";
import { tmpdir } from "os";
import { join } from "path";
import { SearchResponse, SearchResult } from "./types";
import {
  getFindrPath,
  ensureFindrBinaries,
  getMaxResults,
  getFindrEnv,
  getCustomPaths,
  formatFileSize,
  formatRelativeDate,
  getFileIcon,
  trackInteraction,
} from "./utils";
import { openBugReport } from "./bug-report";

function getResultIcon(result: SearchResult): string {
  if (result.is_dir) return "📁";
  return getFileIcon(result.file_type);
}

function ResultActions({ result }: { result: SearchResult }) {
  if (result.is_dir) {
    return (
      <ActionPanel>
        <Action
          title="Open in Finder"
          onAction={() => {
            trackInteraction(result.path, "finder");
            showInFinder(result.path);
          }}
        />
        <Action
          title="Open Folder"
          onAction={() => {
            trackInteraction(result.path, "open");
            open(result.path);
          }}
        />
        <Action
          title="Copy Path"
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          onAction={() => {
            trackInteraction(result.path, "copy");
            Clipboard.copy(result.path);
          }}
        />
        <ActionPanel.Section>
          <Action
            title="Report Bug"
            icon={Icon.Bug}
            onAction={() => openBugReport()}
            shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
          />
        </ActionPanel.Section>
      </ActionPanel>
    );
  }
  return (
    <ActionPanel>
      <Action
        title="Open File"
        onAction={() => {
          trackInteraction(result.path, "open");
          open(result.path);
        }}
      />
      <Action
        title="Show in Finder"
        shortcut={{ modifiers: ["cmd"], key: "return" }}
        onAction={() => {
          trackInteraction(result.path, "finder");
          showInFinder(result.path);
        }}
      />
      <Action.ToggleQuickLook
        shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
      />
      <Action
        title="Copy Path"
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        onAction={() => {
          trackInteraction(result.path, "copy");
          Clipboard.copy(result.path);
        }}
      />
      <Action
        title="Copy Filename"
        shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
        onAction={() => {
          trackInteraction(result.path, "copy");
          Clipboard.copy(result.filename);
        }}
      />
      <ActionPanel.Section>
        <Action
          title="Report Bug"
          icon={Icon.Bug}
          onAction={() => openBugReport()}
          shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

/** Debounce hook — prevents useExec from firing on every keystroke */
function useDebouncedValue(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    timerRef.current = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timerRef.current);
  }, [value, delayMs]);

  return debounced;
}

export default function SearchFiles() {
  const [query, setQuery] = useState("");
  const [findrPath, setFindrPath] = useState(() => getFindrPath());
  const maxResults = getMaxResults();
  const findrEnv = getFindrEnv();
  const binaryExists = useMemo(() => existsSync(findrPath), [findrPath]);

  // Auto-download findr binary from GitHub Releases if not present
  useEffect(() => {
    if (binaryExists) return;
    let cancelled = false;
    showToast({
      style: Toast.Style.Animated,
      title: "Downloading findr engine...",
    });
    ensureFindrBinaries()
      .then((path) => {
        if (cancelled) return;
        setFindrPath(path);
        showToast({ style: Toast.Style.Success, title: "findr ready" });
      })
      .catch((err) => {
        if (cancelled) return;
        showToast({
          style: Toast.Style.Failure,
          title: "Download failed",
          message: String(err),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [binaryExists]);

  // Debounce search input — prevents racing subprocesses on fast typing
  const debouncedQuery = useDebouncedValue(query, 300);
  const isSearchReady = debouncedQuery.trim().length >= 2;

  // Phase 1: Fast search (no semantic) — fires immediately on debounced query
  const [searchData, setSearchData] = useState<SearchResponse | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<Error | null>(null);

  useEffect(() => {
    if (!isSearchReady || !binaryExists) {
      setSearchData(null);
      setSearchError(null);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    setSearchError(null);
    let killed = false;
    const child = execFile(
      findrPath,
      [
        "search",
        debouncedQuery,
        "--json",
        "--limit",
        String(maxResults),
        "--no-semantic",
      ],
      { env: { ...process.env, ...findrEnv } },
      (err, stdout) => {
        if (killed) return;
        if (err) {
          setSearchError(new Error(err.message));
          setSearchLoading(false);
          return;
        }
        try {
          setSearchData(JSON.parse(stdout) as SearchResponse);
          setSearchError(null);
        } catch {
          setSearchError(new Error("Failed to parse search output"));
        }
        setSearchLoading(false);
      },
    );

    return () => {
      killed = true;
      child.kill();
    };
  }, [debouncedQuery, isSearchReady, binaryExists]);

  // Phase 2: Semantic search — fires 1s after user stops typing, merges results
  const debouncedSemantic = useDebouncedValue(query, 1300); // 300ms base + 1000ms extra
  const isSemanticReady = debouncedSemantic.trim().length >= 2;

  useEffect(() => {
    if (!isSemanticReady || !binaryExists) return;
    // Only fire if fast results already loaded (avoid double-loading on first render)
    if (!searchData) return;

    let killed = false;
    const child = execFile(
      findrPath,
      ["search", debouncedSemantic, "--json", "--limit", String(maxResults)],
      { env: { ...process.env, ...findrEnv }, timeout: 4000 },
      (err, stdout) => {
        if (killed) return;
        if (err) return; // silently skip — fast results already showing
        try {
          const semanticData = JSON.parse(stdout) as SearchResponse;
          // Only update if more results or higher scores
          if (semanticData.total_results > 0) {
            setSearchData(semanticData);
          }
        } catch {
          // ignore — fast results stay
        }
      },
    );

    return () => {
      killed = true;
      child.kill();
    };
  }, [debouncedSemantic, isSemanticReady, binaryExists, searchData !== null]);

  // Recent files: stale-then-refresh pattern
  // 1. Instant: show cached results (--no-sync, <50ms)
  // 2. Background: sync + fresh results, replace if different
  const [recentData, setRecentData] = useState<SearchResponse | null>(null);
  const [recentLoading, setRecentLoading] = useState(true);

  useEffect(() => {
    if (!binaryExists) {
      setRecentLoading(false);
      return;
    }
    let cancelled = false;

    // Phase 1: instant cached results (no sync)
    const staleChild = execFile(
      findrPath,
      ["search", "", "--json", "--limit", String(maxResults), "--no-sync"],
      { env: { ...process.env, ...findrEnv } },
      (err, stdout) => {
        if (cancelled) return;
        if (!err && stdout) {
          try {
            setRecentData(JSON.parse(stdout));
          } catch {
            /* ignore */
          }
        }
        setRecentLoading(false);
      },
    );

    // Phase 2: background sync + fresh results (replaces stale)
    const freshChild = execFile(
      findrPath,
      ["search", "", "--json", "--limit", String(maxResults)],
      { env: { ...process.env, ...findrEnv } },
      (err, stdout) => {
        if (cancelled) return;
        if (!err && stdout) {
          try {
            setRecentData(JSON.parse(stdout));
          } catch {
            /* ignore */
          }
        }
      },
    );

    return () => {
      cancelled = true;
      staleChild.kill();
      freshChild.kill();
    };
  }, [findrPath, binaryExists]);

  // Auto-index new custom paths: detect preference changes, debounce 10s, index only new paths.
  // Timer ref used so cleanup can always reach it (timer is set inside async .then callback).
  const customPaths = getCustomPaths();
  const indexTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  useEffect(() => {
    if (!binaryExists || !customPaths) return;

    LocalStorage.getItem<string>("findr_custom_paths").then((stored) => {
      const storedSet = new Set(
        (stored || "")
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean),
      );
      const currentList = customPaths
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      const newPaths = currentList.filter((p) => !storedSet.has(p));

      if (newPaths.length > 0) {
        // Debounce 10s to let user finish editing
        indexTimerRef.current = setTimeout(() => {
          for (const p of newPaths) {
            execFile(findrPath, ["index", "add-path", p], () => {});
          }
          LocalStorage.setItem("findr_custom_paths", currentList.join(","));
        }, 10000);
      } else if (currentList.length > 0 && !stored) {
        // First time: store current paths without triggering index
        LocalStorage.setItem("findr_custom_paths", currentList.join(","));
      }
    });

    return () => {
      if (indexTimerRef.current) clearTimeout(indexTimerRef.current);
    };
  }, [customPaths, binaryExists]);

  const isTyping = query.length > 0;
  const showRecent = !isTyping && recentData?.mode === "recent";
  const recentResults = recentData?.results || [];

  const searchResults = searchData?.results || [];
  const elapsed = searchData?.elapsed_ms ?? 0;
  const isIndexing = searchData?.mode === "indexing";

  // Show loading only during active search, not during initial debounce
  const isLoading = isTyping
    ? searchLoading || (query !== debouncedQuery && isSearchReady)
    : recentLoading;

  const error = searchError;

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Search failed",
        message: error.message,
        primaryAction: {
          title: "Copy Error",
          shortcut: { modifiers: ["cmd"], key: "t" },
          onAction: async (toast) => {
            await Clipboard.copy(error.message);
            toast.hide();
          },
        },
      });
    }
  }, [error]);

  useEffect(() => {
    if (isIndexing) {
      showToast({
        style: Toast.Style.Animated,
        title: "Building index for the first time...",
        message: "This takes ~25 seconds. Search again shortly.",
      });
    } else if (searchData !== null) {
      showToast({ style: Toast.Style.Success, title: "" }).then((t) =>
        t.hide(),
      );
    }
  }, [isIndexing, searchData]);

  if (!binaryExists) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Findr Engine Not Found"
          description="The search engine binary is missing. Try reinstalling the extension."
          actions={
            <ActionPanel>
              <Action
                title="Report Bug"
                onAction={() => openBugReport("Findr engine binary not found")}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Something Went Wrong"
          description={error.message}
          actions={
            <ActionPanel>
              <Action
                title="Report Bug with Diagnostics"
                onAction={() => openBugReport(error.message)}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={true}
      searchBarPlaceholder="Search files... (e.g. 'cv pdf', 'project folder', 'png in:downloads')"
      onSearchTextChange={setQuery}
    >
      {showRecent ? (
        <List.Section title="Recent Files">
          {recentResults.map((result, index) => (
            <ResultItem
              key={`recent-${result.path}-${index}`}
              result={result}
            />
          ))}
        </List.Section>
      ) : !isTyping ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Type to search"
          description="Searches filenames and file contents. Append a type to filter (e.g. 'invoice pdf')"
        />
      ) : query.trim().length < 2 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Type one more character"
          description="Search requires at least 2 characters"
        />
      ) : isIndexing ? (
        <List.EmptyView
          icon={Icon.Clock}
          title="Building index..."
          description="First run: indexing your files (~25 seconds). Search again in a moment."
        />
      ) : searchResults.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title="No results"
          description={`Nothing found for "${query}".`}
        />
      ) : (
        <List.Section
          title={`${searchResults.length} results`}
          subtitle={`${elapsed}ms`}
        >
          {searchResults.map((result, index) => (
            <ResultItem
              key={`search-${result.path}-${index}`}
              result={result}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function ResultItem({ result }: { result: SearchResult }) {
  return (
    <List.Item
      icon={getResultIcon(result)}
      title={result.filename}
      accessories={result.is_dir ? [{ tag: "Folder" }] : []}
      quickLook={
        result.is_dir ? undefined : { path: result.path, name: result.filename }
      }
      detail={<ResultDetail result={result} />}
      actions={<ResultActions result={result} />}
    />
  );
}

const IMAGE_TYPES = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "svg",
  "heic",
  "tiff",
  "bmp",
  "ico",
]);
const TEXT_PREVIEW_TYPES = new Set([
  "md",
  "txt",
  "csv",
  "html",
  "xml",
  "json",
  "yaml",
  "yml",
  "toml",
  "ini",
  "cfg",
  "conf",
  "log",
  "sql",
  "sh",
  "zsh",
  "bash",
  "rs",
  "ts",
  "tsx",
  "js",
  "jsx",
  "py",
  "go",
  "rb",
  "java",
  "c",
  "cpp",
  "h",
  "css",
  "scss",
]);
const MAX_PREVIEW_BYTES = 8192;
const MAX_PREVIEW_LINES = 40;

const RENDER_AS_PLAIN = new Set(["txt", "md"]);

function readTextPreview(path: string, ext: string): string {
  try {
    const buf = Buffer.alloc(MAX_PREVIEW_BYTES);
    const fd = openSync(path, "r");
    const bytesRead = readSync(fd, buf, 0, MAX_PREVIEW_BYTES, 0);
    closeSync(fd);
    const raw = buf.slice(0, bytesRead).toString("utf-8");
    // Cut at last complete line to avoid mid-line truncation
    const lastNewline = raw.lastIndexOf("\n");
    const text = lastNewline > 0 ? raw.slice(0, lastNewline) : raw;
    const allLines = text.split("\n");
    const truncated =
      allLines.length > MAX_PREVIEW_LINES || bytesRead >= MAX_PREVIEW_BYTES;
    const lines = allLines.slice(0, MAX_PREVIEW_LINES);
    const content = lines.join("\n");

    const truncNote = truncated ? "\n\n---" : "";

    // Plain text / markdown: render as-is (no code box)
    if (RENDER_AS_PLAIN.has(ext)) {
      return content + truncNote;
    }
    // CSV: render as markdown table (first 5 columns, 20 rows)
    if (ext === "csv") {
      const rows = lines.slice(0, 20);
      if (rows.length >= 2) {
        const parsed = rows.map((r) =>
          r.split(",").map((c) => c.trim().replace(/^"|"$/g, "")),
        );
        const maxCols = Math.min(parsed[0].length, 5);
        const trim = (s: string) => (s.length > 20 ? s.slice(0, 18) + ".." : s);
        const header =
          "| " + parsed[0].slice(0, maxCols).map(trim).join(" | ") + " |";
        const sep = "| " + Array(maxCols).fill("---").join(" | ") + " |";
        const body = parsed
          .slice(1)
          .map((r) => "| " + r.slice(0, maxCols).map(trim).join(" | ") + " |")
          .join("\n");
        const extra =
          parsed[0].length > 5
            ? `\n\n*+${parsed[0].length - 5} more columns*`
            : "";
        return header + "\n" + sep + "\n" + body + extra;
      }
    }
    // Everything else: syntax-highlighted code block
    const lang =
      ext === "py"
        ? "python"
        : ext === "rs"
          ? "rust"
          : ext === "js" || ext === "jsx"
            ? "javascript"
            : ext === "ts" || ext === "tsx"
              ? "typescript"
              : ext === "rb"
                ? "ruby"
                : ext === "yml" || ext === "yaml"
                  ? "yaml"
                  : ext;
    return "```" + lang + "\n" + content + "\n```" + truncNote;
  } catch {
    return "";
  }
}

function ResultDetail({ result }: { result: SearchResult }) {
  const [preview, setPreview] = useState<string>("");

  // Async file preview — avoids blocking the render thread with synchronous I/O.
  // All branches fall through to a single cleanup that cancels pending work.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let qlChild: ChildProcess | undefined;

    setPreview("");

    // Image: inline markdown (no I/O needed)
    if (result.file_type && IMAGE_TYPES.has(result.file_type)) {
      setPreview(
        `![preview](file://${result.path.split("/").map(encodeURIComponent).join("/")}?raycast-height=250)`,
      );
    }
    // PDF thumbnail via qlmanage (async)
    else if (result.file_type === "pdf") {
      const hash = createHash("md5")
        .update(result.path)
        .digest("hex")
        .slice(0, 16);
      const thumbDir = join(tmpdir(), "findr-thumbs");
      const thumbPath = join(thumbDir, `${hash}.png`);

      if (existsSync(thumbPath)) {
        setPreview(`![preview](file://${thumbPath})\n\n`);
      } else {
        const qlOutDir = join(thumbDir, hash);
        mkdirSync(qlOutDir, { recursive: true });
        if (!cancelled) {
          qlChild = execFile(
            "qlmanage",
            ["-t", result.path, "-s", "600", "-o", qlOutDir],
            { timeout: 3000 },
            () => {
              if (cancelled) return;
              const srcName = result.path.split("/").pop() + ".png";
              const qlPath = join(qlOutDir, srcName);
              if (existsSync(qlPath)) {
                renameSync(qlPath, thumbPath);
              }
              if (existsSync(thumbPath)) {
                setPreview(`![preview](file://${thumbPath})\n\n`);
              }
            },
          );
        }
      }
    }
    // Text/code preview (async read via next tick)
    else if (
      result.file_type &&
      TEXT_PREVIEW_TYPES.has(result.file_type) &&
      !result.is_dir
    ) {
      timer = setTimeout(() => {
        if (cancelled) return;
        const text = readTextPreview(result.path, result.file_type!);
        if (text && !cancelled) {
          setPreview(text + "\n\n");
        }
      }, 0);
    }

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (qlChild) qlChild.kill();
    };
  }, [result.path]);

  let markdown = "";

  // Content snippet first (most important when searching)
  if (result.content_snippet) {
    const sanitized = result.content_snippet
      .replace(/[\\`*_{}[\]()#+\-.!|<>~]/g, "\\$&")
      .replace(/\n/g, "\n> ");
    markdown += `> ${sanitized}\n\n`;
  }

  markdown += preview;

  return (
    <List.Item.Detail
      markdown={markdown || undefined}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Path" text={result.path} />
          <List.Item.Detail.Metadata.Separator />
          {result.is_dir ? (
            <List.Item.Detail.Metadata.Label title="Type" text="FOLDER" />
          ) : (
            result.file_type && (
              <List.Item.Detail.Metadata.Label
                title="Type"
                text={result.file_type.toUpperCase()}
              />
            )
          )}
          {result.size_bytes && !result.is_dir && (
            <List.Item.Detail.Metadata.Label
              title="Size"
              text={formatFileSize(result.size_bytes)}
            />
          )}
          {result.modified && (
            <List.Item.Detail.Metadata.Label
              title="Modified"
              text={formatRelativeDate(result.modified)}
            />
          )}
          {result.interactions > 0 && (
            <List.Item.Detail.Metadata.Label
              title="Interactions"
              text={String(result.interactions)}
            />
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
