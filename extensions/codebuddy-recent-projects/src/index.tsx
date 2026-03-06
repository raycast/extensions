import {
  ActionPanel,
  Action,
  List,
  Icon,
  getPreferenceValues,
  showToast,
  Toast,
  Color,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { homedir } from "os";
import { join, basename } from "path";
import { existsSync } from "fs";
import { exec, execSync } from "child_process";

interface RecentEntry {
  folderUri?: string;
  fileUri?: string;
  label?: string;
  remoteAuthority?: string;
}

interface RecentData {
  entries: RecentEntry[];
}

interface ProjectItem {
  name: string;
  path: string;
  fullUri: string;
  isRemote: boolean;
  isFile: boolean;
  icon: Icon;
  iconColor: Color;
}

interface Preferences {
  cliPath: string;
}

const DB_PATH = join(
  homedir(),
  "Library",
  "Application Support",
  "CodeBuddy CN",
  "User",
  "globalStorage",
  "state.vscdb",
);

const DB_KEY = "history.recentlyOpenedPathsList";

function parseUri(uri: string): string {
  try {
    const url = new URL(uri);
    return decodeURIComponent(url.pathname);
  } catch {
    return uri;
  }
}

function shortenPath(fullPath: string): string {
  const home = homedir();
  if (fullPath.startsWith(home)) {
    return "~" + fullPath.slice(home.length);
  }
  return fullPath;
}

function expandPath(path: string): string {
  return path.startsWith("~") ? path.replace("~", homedir()) : path;
}

async function loadRecentProjects(): Promise<ProjectItem[]> {
  if (!existsSync(DB_PATH)) {
    throw new Error(
      "CodeBuddy CN data not found. Make sure CodeBuddy CN is installed.",
    );
  }

  const query = `SELECT value FROM ItemTable WHERE key = '${DB_KEY}';`;
  const raw = execSync(`sqlite3 "${DB_PATH}" "${query}"`, {
    encoding: "utf-8",
    maxBuffer: 10 * 1024 * 1024,
  });

  if (!raw.trim()) return [];

  const data: RecentData = JSON.parse(raw.trim());
  const items: ProjectItem[] = [];

  for (const entry of data.entries) {
    const uri = entry.folderUri || entry.fileUri;
    if (!uri) continue;

    const isFile = !!entry.fileUri;
    const isRemote = uri.startsWith("vscode-remote://");
    const parsedPath = parseUri(uri);
    const displayName = entry.label || basename(parsedPath) || parsedPath;
    const displayPath = isRemote
      ? entry.label || parsedPath
      : shortenPath(parsedPath);

    items.push({
      name: displayName,
      path: displayPath,
      fullUri: uri,
      isRemote,
      isFile,
      icon: isFile ? Icon.Document : isRemote ? Icon.Globe : Icon.Folder,
      iconColor: isFile ? Color.Blue : isRemote ? Color.Orange : Color.Green,
    });
  }

  return items;
}

function openWithCLI(item: ProjectItem) {
  const { cliPath } = getPreferenceValues<Preferences>();

  const args = item.isRemote
    ? `--folder-uri "${item.fullUri}"`
    : item.isFile
      ? `--goto "${expandPath(item.path)}"`
      : `"${expandPath(item.path)}"`;

  const command = `${cliPath} ${args}`;

  exec(
    command,
    {
      shell: "/bin/zsh",
      env: {
        ...process.env,
        PATH: `/usr/local/bin:/usr/bin:/bin:${homedir()}/.codebuddy/bin:${process.env.PATH || ""}`,
      },
    },
    (err) => {
      if (err) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to open",
          message: err.message,
        });
      }
    },
  );
}

function ProjectListItem({ item }: { item: ProjectItem }) {
  const isLocal = !item.isRemote;

  return (
    <List.Item
      icon={{ source: item.icon, tintColor: item.iconColor }}
      title={item.name}
      subtitle={item.path}
      accessories={[
        item.isRemote
          ? { tag: { value: "SSH", color: Color.Orange } }
          : { tag: { value: "Local", color: Color.Green } },
      ]}
      actions={
        <ActionPanel>
          <Action
            title="Open in Codebuddy Cn"
            icon={Icon.Code}
            onAction={() => openWithCLI(item)}
          />
          <Action.CopyToClipboard
            title="Copy Path"
            content={item.isRemote ? item.fullUri : item.path}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          {isLocal && !item.isFile && (
            <Action.ShowInFinder
              path={expandPath(item.path)}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
            />
          )}
          {isLocal && !item.isFile && (
            <Action.Open
              title="Open in Terminal"
              icon={Icon.Terminal}
              target={expandPath(item.path)}
              application="Terminal"
              shortcut={{ modifiers: ["cmd"], key: "t" }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const {
    data: projects,
    isLoading,
    error,
  } = useCachedPromise(loadRecentProjects);

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to load recent projects",
      message: error.message,
    });
  }

  const folders = projects?.filter((p) => !p.isFile) ?? [];
  const files = projects?.filter((p) => p.isFile) ?? [];

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search recent projects..."
    >
      <List.Section
        title="Recent Projects"
        subtitle={`${folders.length} projects`}
      >
        {folders.map((item, index) => (
          <ProjectListItem key={`folder-${index}`} item={item} />
        ))}
      </List.Section>

      {files.length > 0 && (
        <List.Section title="Recent Files" subtitle={`${files.length} files`}>
          {files.map((item, index) => (
            <ProjectListItem key={`file-${index}`} item={item} />
          ))}
        </List.Section>
      )}
    </List>
  );
}
