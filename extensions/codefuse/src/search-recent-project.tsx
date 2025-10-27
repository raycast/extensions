import { Action, ActionPanel, Color, Icon, List, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { execFile as execFileCallback } from "child_process";
import { existsSync } from "fs";
import { homedir } from "os";
import { basename, join } from "path";
import { promisify } from "util";
import { fileURLToPath } from "url";

const execFile = promisify(execFileCallback);

type RecentEntryType = "folder" | "workspace" | "file";

type RawEntry = {
  folderUri?: string;
  fileUri?: string;
  remoteAuthority?: string;
  workspace?: { configPath?: string };
};

interface RecentEntry {
  id: string;
  name: string;
  path: string;
  type: RecentEntryType;
}

type Preferences = {
  codefuseCli?: string;
};

const STATE_DB_SEGMENTS: Partial<Record<NodeJS.Platform, string[]>> = {
  darwin: ["Library", "Application Support", "CodeFuse", "User", "globalStorage", "state.vscdb"],
  linux: [".config", "CodeFuse", "User", "globalStorage", "state.vscdb"],
  win32: ["AppData", "Roaming", "CodeFuse", "User", "globalStorage", "state.vscdb"],
};

export default function Command() {
  const { data, isLoading, error, revalidate } = useCachedPromise(fetchRecentEntries);
  const entries = data ?? [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search recent Codefuse projects" throttle isShowingDetail={false}>
      {!entries.length && !isLoading && (
        <List.EmptyView
          title={error ? "Unable to load recent projects" : "No recent projects found"}
          description={
            error ? getErrorMessage(error) : "Open a project in Codefuse and it will appear here automatically."
          }
          actions={<RefreshAction onRefresh={revalidate} />}
        />
      )}
      {entries.map((entry) => (
        <List.Item
          key={entry.id}
          title={entry.name}
          subtitle={entry.path}
          icon={getEntryIcon(entry.type)}
          accessories={[{ tag: { value: getEntryLabel(entry.type), color: getEntryColor(entry.type) } }]}
          actions={<EntryActions entry={entry} onRefresh={revalidate} />}
        />
      ))}
    </List>
  );
}

function RefreshAction({ onRefresh }: { onRefresh: () => void }) {
  return (
    <ActionPanel>
      <Action
        title="Reload Recent Projects"
        icon={Icon.ArrowClockwise}
        onAction={onRefresh}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
      />
    </ActionPanel>
  );
}

function getEntryIcon(type: RecentEntryType) {
  switch (type) {
    case "workspace":
      return Icon.AppWindow;
    case "file":
      return Icon.TextDocument;
    case "folder":
    default:
      return Icon.Folder;
  }
}

function getEntryLabel(type: RecentEntryType) {
  switch (type) {
    case "workspace":
      return "Workspace";
    case "file":
      return "File";
    case "folder":
    default:
      return "Folder";
  }
}

function getEntryColor(type: RecentEntryType) {
  switch (type) {
    case "workspace":
      return Color.Blue;
    case "file":
      return Color.Green;
    case "folder":
    default:
      return Color.Magenta;
  }
}

async function fetchRecentEntries(): Promise<RecentEntry[]> {
  const dbPath = resolveStateDbPath();
  if (!existsSync(dbPath)) {
    throw new Error(`Could not find Codefuse data at ${dbPath}`);
  }

  const query = "SELECT value FROM ItemTable WHERE key='history.recentlyOpenedPathsList';";
  const { stdout } = await execFile("sqlite3", [dbPath, query]);
  const rawPayload = stdout.trim();

  if (!rawPayload) {
    return [];
  }

  let parsed: { entries?: RawEntry[] };
  try {
    parsed = JSON.parse(rawPayload);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown reason";
    throw new Error(`Failed to parse Codefuse recent projects data: ${reason}`);
  }

  const entries = parsed.entries ?? [];
  const seen = new Set<string>();

  return entries
    .map((entry, index) => toRecentEntry(entry, index))
    .filter((entry): entry is RecentEntry => Boolean(entry))
    .filter((entry) => {
      if (seen.has(entry.path)) {
        return false;
      }
      seen.add(entry.path);
      return true;
    });
}

function toRecentEntry(entry: RawEntry, index: number): RecentEntry | undefined {
  if ("folderUri" in entry && entry.folderUri) {
    const path = normalizeUri(entry.folderUri);
    return createEntry(path, "folder", index);
  }

  if ("workspace" in entry && entry.workspace?.configPath) {
    const path = normalizeUri(entry.workspace.configPath);
    return createEntry(path, "workspace", index);
  }

  if ("fileUri" in entry && entry.fileUri) {
    const path = normalizeUri(entry.fileUri);
    return createEntry(path, "file", index);
  }

  return undefined;
}

function normalizeUri(raw: string) {
  try {
    return fileURLToPath(raw);
  } catch {
    // Fall back to best-effort cleanup if fileURLToPath cannot parse the URI
    return raw.replace(/^file:\/\//, "");
  }
}

function createEntry(path: string, type: RecentEntryType, index: number): RecentEntry {
  const name = basename(path) || path;

  return {
    id: `${type}-${path}-${index}`,
    name,
    path,
    type,
  };
}

function resolveStateDbPath() {
  const segments = STATE_DB_SEGMENTS[process.platform];
  if (!segments) {
    throw new Error("Unsupported platform for Codefuse recent projects.");
  }

  return join(homedir(), ...segments);
}

function EntryActions({ entry, onRefresh }: { entry: RecentEntry; onRefresh: () => void }) {
  return (
    <ActionPanel>
      <Action
        title="Open in Codefuse"
        icon={Icon.Hammer}
        onAction={() => openWithCodefuse(entry.path)}
        shortcut={{ modifiers: ["cmd"], key: "o" }}
      />
      <Action.ShowInFinder path={entry.path} />
      <Action.CopyToClipboard title="Copy Path" content={entry.path} />
      <Action
        title="Reload Recent Projects"
        icon={Icon.ArrowClockwise}
        onAction={onRefresh}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
      />
    </ActionPanel>
  );
}

async function openWithCodefuse(target: string) {
  const toast = await showToast(Toast.Style.Animated, "Opening in Codefuse");
  try {
    const cli = resolveCodefuseCli();
    await execFile(cli, [target]);
    toast.style = Toast.Style.Success;
    toast.title = "Project opened in Codefuse";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to open in Codefuse";
    toast.message = getErrorMessage(error);
  }
}

function getErrorMessage(error: unknown) {
  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
}

function resolveCodefuseCli() {
  const { codefuseCli } = getPreferenceValues<Preferences>();
  const preferredPath = codefuseCli?.trim();
  if (preferredPath && existsSync(preferredPath)) {
    return preferredPath;
  }

  const envPath = process.env.CODEFUSE_CLI?.trim();
  if (envPath && existsSync(envPath)) {
    return envPath;
  }

  const discovered = findInPath("codefuse");
  if (discovered) {
    return discovered;
  }

  const fallbackCandidates = ["/usr/local/bin/codefuse", "/opt/homebrew/bin/codefuse", "/usr/bin/codefuse"];
  for (const candidate of fallbackCandidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    "Could not find the Codefuse CLI. Set the Codefuse CLI Path preference, define CODEFUSE_CLI, or ensure it is in your PATH.",
  );
}

function findInPath(binary: string) {
  const pathValue = process.env.PATH;
  if (!pathValue) {
    return undefined;
  }

  for (const entry of pathValue.split(":")) {
    const candidate = join(entry, binary);
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return undefined;
}
