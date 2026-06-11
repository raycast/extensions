import {
  Action,
  ActionPanel,
  Application,
  Detail,
  Icon,
  LaunchProps,
  List,
  getFrontmostApplication,
  showToast,
  Toast,
} from "@raycast/api";
import { useExec } from "@raycast/utils";
import { basename, dirname, extname } from "path";
import { execFileSync } from "child_process";
import { homedir } from "os";
import { useCallback, useEffect, useState, useMemo } from "react";
import { closeSync, openSync, readSync, readdirSync, statSync } from "fs";
import {
  AppRef,
  clingInstalled,
  getClingDefault,
  getEditorApp,
  getShelfApp,
  getTerminalApp,
  NOT_INSTALLED_MARKDOWN,
  resolveClingCLI,
} from "./cling";

const HOME = homedir();
const COPY_WITH_TILDE = getClingDefault("copyPathsWithTilde") !== "0";

function copyablePath(filePath: string): string {
  return COPY_WITH_TILDE ? tildify(filePath) : filePath;
}
const MAX_PREVIEW_BYTES = 20_000;
const MAX_PREVIEW_LINES = 80;

function readHead(filePath: string, maxBytes: number): string {
  const fd = openSync(filePath, "r");
  try {
    const buf = Buffer.alloc(maxBytes);
    const bytesRead = readSync(fd, buf, 0, maxBytes, 0);
    return buf.subarray(0, bytesRead).toString("utf-8");
  } finally {
    closeSync(fd);
  }
}

function truncateLines(text: string, maxLines: number): { content: string; truncated: boolean } {
  const lines = text.split("\n");
  if (lines.length <= maxLines) return { content: text, truncated: false };
  return { content: lines.slice(0, maxLines).join("\n"), truncated: true };
}

const IMAGE_EXTS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".bmp",
  ".ico",
  ".tiff",
  ".tif",
  ".svg",
  ".heic",
]);
const VIDEO_EXTS = new Set([".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v"]);
const PDF_EXTS = new Set([".pdf"]);
const CODE_LANGS: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "tsx",
  ".js": "javascript",
  ".jsx": "jsx",
  ".py": "python",
  ".rb": "ruby",
  ".rs": "rust",
  ".go": "go",
  ".swift": "swift",
  ".kt": "kotlin",
  ".java": "java",
  ".c": "c",
  ".cpp": "cpp",
  ".h": "c",
  ".hpp": "cpp",
  ".m": "objectivec",
  ".cs": "csharp",
  ".php": "php",
  ".lua": "lua",
  ".sh": "bash",
  ".zsh": "bash",
  ".fish": "bash",
  ".bash": "bash",
  ".html": "html",
  ".css": "css",
  ".scss": "scss",
  ".less": "less",
  ".json": "json",
  ".yaml": "yaml",
  ".yml": "yaml",
  ".toml": "toml",
  ".xml": "xml",
  ".sql": "sql",
  ".graphql": "graphql",
  ".r": "r",
  ".dart": "dart",
  ".ex": "elixir",
  ".exs": "elixir",
  ".erl": "erlang",
  ".hs": "haskell",
  ".ml": "ocaml",
  ".vim": "vim",
  ".el": "lisp",
  ".clj": "clojure",
  ".dockerfile": "dockerfile",
  ".proto": "protobuf",
};

function tildify(path: string) {
  return path.startsWith(HOME) ? "~" + path.slice(HOME.length) : path;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function filePreviewMarkdown(filePath: string, isDir: boolean): string {
  const name = basename(filePath);
  const ext = extname(filePath).toLowerCase();

  if (isDir) {
    try {
      const entries = readdirSync(filePath, { withFileTypes: true })
        .sort((a, b) => {
          if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
          return a.name.localeCompare(b.name);
        })
        .slice(0, 50);
      const lines = entries.map((e) => `- ${e.isDirectory() ? "📁" : "📄"} ${e.name}`);
      return `# 📁 ${name}\n\n${lines.join("\n")}${entries.length === 50 ? "\n- ..." : ""}`;
    } catch {
      return `# 📁 ${name}\n\n*Unable to list directory contents.*`;
    }
  }

  if (IMAGE_EXTS.has(ext)) {
    return `![${name}](<${filePath}>)`;
  }

  if (VIDEO_EXTS.has(ext)) {
    return `# 🎬 ${name}\n\n*Video file. Press Enter to open or Cmd+Y for QuickLook.*`;
  }

  if (PDF_EXTS.has(ext)) {
    return `# 📕 ${name}\n\n*PDF document. Press Enter to open or Cmd+Y for QuickLook.*`;
  }

  // Text/code preview: only read what we need
  const lang = CODE_LANGS[ext];
  try {
    const stat = statSync(filePath);
    const tooBig = stat.size > MAX_PREVIEW_BYTES;
    const raw = readHead(filePath, MAX_PREVIEW_BYTES);

    // Check for binary content (null bytes in first chunk)
    if (raw.includes("\0")) {
      return `# ${name}\n\n*Binary file (${formatBytes(stat.size)}). Press Enter to open or Cmd+Y for QuickLook.*`;
    }

    if (ext === ".md" || ext === ".markdown") {
      const { content, truncated } = truncateLines(raw, MAX_PREVIEW_LINES);
      return truncated || tooBig ? content + "\n\n---\n*Preview truncated.*" : content;
    }

    const { content, truncated } = truncateLines(raw, MAX_PREVIEW_LINES);
    const fence = lang || "";
    const suffix = truncated || tooBig ? "\n// ..." : "";
    return `\`\`\`${fence}\n${content}${suffix}\n\`\`\``;
  } catch {
    return `# ${name}\n\n*Unable to read file contents.*`;
  }
}

function FileDetail({ filePath, isDir }: { filePath: string; isDir: boolean }) {
  let stat;
  try {
    stat = statSync(filePath);
  } catch {
    return <Detail markdown={`# ${basename(filePath)}\n\nUnable to read file metadata.`} />;
  }

  const name = basename(filePath);
  const ext = extname(filePath);
  const markdown = filePreviewMarkdown(filePath, isDir);

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Name" text={name} />
          <Detail.Metadata.Label title="Path" text={tildify(filePath)} />
          {!isDir && ext ? <Detail.Metadata.Label title="Extension" text={ext} /> : null}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Size" text={isDir ? "-" : formatBytes(stat.size)} />
          <Detail.Metadata.Label title="Created" text={formatDate(stat.birthtime)} />
          <Detail.Metadata.Label title="Modified" text={formatDate(stat.mtime)} />
          <Detail.Metadata.Label title="Last Accessed" text={formatDate(stat.atime)} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Type">
            <Detail.Metadata.TagList.Item text={isDir ? "Directory" : "File"} color={isDir ? "#007AFF" : "#34C759"} />
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.Open title="Open" target={filePath} />
          <Action.ShowInFinder path={filePath} />
          <Action.CopyToClipboard title="Copy Path" content={copyablePath(filePath)} />
        </ActionPanel>
      }
    />
  );
}

type AppPaths = {
  terminal: AppRef;
  editor: AppRef;
  shelf: AppRef | undefined;
  frontmost: Application | undefined;
};

function appIcon(app: { path: string | undefined }, fallback: Icon) {
  return app.path ? { fileIcon: app.path } : fallback;
}

function appTarget(app: AppRef): string {
  return app.path ?? app.name;
}

function samePath(a: string | undefined, b: string | undefined): boolean {
  return !!a && !!b && a.replace(/\/+$/, "") === b.replace(/\/+$/, "");
}

function FileActions({
  filePath,
  isDir,
  name,
  searchText,
  onRemove,
  apps,
  cli,
}: {
  filePath: string;
  isDir: boolean;
  name: string;
  searchText: string;
  onRemove: (path: string) => void;
  apps: AppPaths;
  cli: string;
}) {
  const terminalDir = isDir ? filePath : dirname(filePath);
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.Open title="Open" target={filePath} />
        <Action.ShowInFinder path={filePath} />
        <Action.OpenWith path={filePath} shortcut={{ modifiers: ["cmd"], key: "o" }} />
        <Action.ToggleQuickLook shortcut={{ modifiers: ["cmd"], key: "y" }} />
      </ActionPanel.Section>

      <ActionPanel.Section title="Info">
        <Action.Push
          title="Show Details"
          icon={Icon.Info}
          target={<FileDetail filePath={filePath} isDir={isDir} />}
          shortcut={{ modifiers: ["cmd"], key: "i" }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Copy">
        <Action.CopyToClipboard
          title="Copy Path"
          content={copyablePath(filePath)}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
        <Action.CopyToClipboard title="Copy Name" content={name} shortcut={{ modifiers: ["cmd", "shift"], key: "n" }} />
        <Action.Paste
          title="Paste Path in Frontmost App"
          content={copyablePath(filePath)}
          shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Apps">
        <Action.Open
          title={`Open in ${apps.terminal.name}`}
          icon={appIcon(apps.terminal, Icon.Terminal)}
          target={terminalDir}
          application={appTarget(apps.terminal)}
          shortcut={{ modifiers: ["cmd"], key: "t" }}
        />
        <Action.Open
          title={apps.editor.path ? `Edit with ${apps.editor.name}` : "Open in Editor"}
          icon={appIcon(apps.editor, Icon.Code)}
          target={filePath}
          application={appTarget(apps.editor)}
          shortcut={{ modifiers: ["cmd"], key: "e" }}
        />
        {apps.shelf && (
          <Action.Open
            title={`Shelve in ${apps.shelf.name}`}
            icon={appIcon(apps.shelf, Icon.Tray)}
            target={filePath}
            application={appTarget(apps.shelf)}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />
        )}
        {apps.frontmost &&
          !samePath(apps.frontmost.path, apps.editor.path) &&
          !samePath(apps.frontmost.path, apps.terminal.path) &&
          !samePath(apps.frontmost.path, apps.shelf?.path) && (
            <Action.Open
              title={`Open in ${apps.frontmost.name}`}
              icon={{ fileIcon: apps.frontmost.path }}
              target={filePath}
              application={apps.frontmost}
              shortcut={{ modifiers: ["cmd", "opt"], key: "return" }}
            />
          )}
      </ActionPanel.Section>

      <ActionPanel.Section title="Other">
        {searchText && (
          <Action.CreateQuicklink
            title="Save as Quick Filter"
            quicklink={{
              link: `raycast://extensions/alin/cling/fuzzy-search-files?fallbackText=${encodeURIComponent(searchText)}`,
              name: `Cling: ${searchText}`,
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
          />
        )}
        <Action
          title="Exclude from Index"
          icon={Icon.EyeDisabled}
          shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
          onAction={async () => {
            try {
              execFileSync(cli, ["index", "remove", filePath]);
              onRemove(filePath);
              await showToast({ style: Toast.Style.Success, title: "Excluded from index", message: name });
            } catch {
              await showToast({ style: Toast.Style.Failure, title: "Failed to exclude from index" });
            }
          }}
        />
        <Action.Trash
          paths={filePath}
          shortcut={{ modifiers: ["cmd"], key: "backspace" }}
          onTrash={() => onRemove(filePath)}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

export default function Command(props: LaunchProps) {
  const installed = useMemo(() => clingInstalled(), []);
  const cli = useMemo(() => resolveClingCLI(), []);
  const baseApps = useMemo(() => ({ terminal: getTerminalApp(), editor: getEditorApp(), shelf: getShelfApp() }), []);
  const [frontmost, setFrontmost] = useState<Application | undefined>();
  useEffect(() => {
    getFrontmostApplication()
      .then(setFrontmost)
      .catch(() => {});
  }, []);
  const apps = useMemo<AppPaths>(() => ({ ...baseApps, frontmost }), [baseApps, frontmost]);

  const [searchText, setSearchText] = useState(props.fallbackText ?? "");
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const { isLoading, data } = useExec(
    cli,
    searchText.length > 0 ? ["search", searchText, "--count", "50"] : ["recents", "--count", "50"],
    { keepPreviousData: true, execute: installed },
  );

  const results = useMemo(() => {
    if (!data) return [];
    return data
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((raw) => {
        const isDir = raw.endsWith("/");
        const filePath = isDir ? raw.slice(0, -1) : raw;
        return { filePath, isDir, name: basename(filePath), dir: tildify(dirname(filePath)) };
      })
      .filter(({ filePath }) => !hidden.has(filePath));
  }, [data, hidden]);

  const onRemove = useCallback((path: string) => {
    setHidden((prev) => new Set(prev).add(path));
  }, []);

  if (!installed) {
    return <Detail markdown={NOT_INSTALLED_MARKDOWN} />;
  }

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
      searchBarPlaceholder="Fuzzy search files and folders..."
      throttle
    >
      <List.EmptyView icon={Icon.MagnifyingGlass} title="No results" description="Try a different query" />
      {results.map(({ filePath, isDir, name, dir }) => (
        <List.Item
          key={filePath}
          icon={{ fileIcon: filePath }}
          title={name}
          subtitle={dir}
          accessories={isDir ? [{ icon: Icon.Folder, tooltip: "Directory" }] : []}
          quickLook={{ path: filePath }}
          actions={
            <FileActions
              filePath={filePath}
              isDir={isDir}
              name={name}
              searchText={searchText}
              onRemove={onRemove}
              apps={apps}
              cli={cli}
            />
          }
        />
      ))}
    </List>
  );
}
