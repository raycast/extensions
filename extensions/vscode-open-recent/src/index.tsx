import { Action, ActionPanel, getPreferenceValues, Icon, Image, List } from "@raycast/api";
import { useSQL } from "@raycast/utils";
import { execFile } from "child_process";
import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { basename, dirname, join } from "path";
import { fileURLToPath } from "url";

type Preferences = { build?: string };

// build (folder under ~/Library/Application Support) -> app name for `open -a`,
// app bundle (to find product.json) and URL scheme for remote entries
const BUILDS: Record<string, { app: string; bundle: string; scheme: string }> = {
  Code: { app: "Visual Studio Code", bundle: "Visual Studio Code.app", scheme: "vscode" },
  "Code - Insiders": {
    app: "Visual Studio Code - Insiders",
    bundle: "Visual Studio Code - Insiders.app",
    scheme: "vscode-insiders",
  },
  Cursor: { app: "Cursor", bundle: "Cursor.app", scheme: "cursor" },
  VSCodium: { app: "VSCodium", bundle: "VSCodium.app", scheme: "vscode-oss" },
  Windsurf: { app: "Windsurf", bundle: "Windsurf.app", scheme: "windsurf" },
};

const build = getPreferenceValues<Preferences>().build || "Code";
const { app: appName, bundle, scheme } = BUILDS[build] ?? BUILDS.Code;
const appPath = [join("/Applications", bundle), join(homedir(), "Applications", bundle)].find((c) => existsSync(c));
const appIcon: Image.ImageLike = appPath ? { fileIcon: appPath } : Icon.Code;
const globalStorageDir = join(homedir(), "Library", "Application Support", build, "User", "globalStorage");

// Newer builds keep the recent list in a shared DB: ~/<sharedDataFolderName>/sharedStorage/state.vscdb
// (folder name comes from the app's product.json). Same lookup order as the original extension.
function getSharedDbPath(): string | undefined {
  const candidates = [
    join("/Applications", bundle, "Contents", "Resources", "app", "product.json"),
    join(homedir(), "Applications", bundle, "Contents", "Resources", "app", "product.json"),
  ];
  const productJson = candidates.find((c) => existsSync(c));
  if (!productJson) return undefined;
  try {
    const name = (JSON.parse(readFileSync(productJson, "utf-8")) as { sharedDataFolderName?: string })
      .sharedDataFolderName;
    return name ? join(homedir(), name, "sharedStorage", "state.vscdb") : undefined;
  } catch {
    return undefined;
  }
}

function getDbPath(): string {
  const shared = getSharedDbPath();
  return shared && existsSync(shared) ? shared : join(globalStorageDir, "state.vscdb");
}

const dbPath = getDbPath();

type Row = { entries: string };
type Entry = {
  folderUri?: string;
  fileUri?: string;
  workspace?: { configPath: string };
  remoteAuthority?: string;
  label?: string;
};

// Same key the original extension reads (older builds used history.recentlyOpenedPathsList).
const QUERY = `
  SELECT json_extract(value, '$.entries') AS entries
  FROM ItemTable
  WHERE key IN ('recently.opened', 'history.recentlyOpenedPathsList')
  ORDER BY CASE key WHEN 'recently.opened' THEN 0 ELSE 1 END
  LIMIT 1
`;

type Item = {
  uri: string;
  kind: "folder" | "workspace" | "file";
  title: string;
  subtitle: string;
  keywords: string[];
  localPath?: string; // set for local entries
  remote?: boolean;
  tag?: string; // remote type shown as an accessory, e.g. "SSH: myhost"
  icon: Image.ImageLike;
};

function formatAuthority(a: string): string {
  if (a.startsWith("ssh-remote+")) return `SSH: ${a.slice("ssh-remote+".length)}`;
  if (a.startsWith("wsl+")) return `WSL: ${a.slice(4)}`;
  if (a.startsWith("dev-container+")) return "Dev Container";
  if (a.startsWith("attached-container+")) return "Container";
  if (a.startsWith("codespaces+")) return "Codespaces";
  return a;
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function toItems(rows: Row[] | undefined): Item[] {
  // `rows` is undefined while useSQL is still loading: render nothing yet, otherwise the
  if (!rows) return [];
  let entries: Entry[] = [];
  try {
    if (rows?.[0]?.entries) entries = JSON.parse(rows[0].entries);
  } catch {
    entries = [];
  }

  const home = homedir();
  const items: Item[] = [];
  const seen = new Set<string>();

  for (const e of entries) {
    const uri = e.folderUri ?? e.workspace?.configPath ?? e.fileUri;
    if (!uri || seen.has(uri)) continue;
    seen.add(uri);
    const kind = e.folderUri ? "folder" : e.workspace ? "workspace" : "file";

    if (uri.startsWith("file://")) {
      const path = fileURLToPath(uri);
      if (!existsSync(path)) continue; // project was deleted/moved
      items.push({
        uri,
        kind,
        icon: { fileIcon: path },
        title: safeDecode(basename(path)),
        subtitle: dirname(path).replace(home, "~"),
        keywords: path.split("/"),
        localPath: path,
      });
    } else if (uri.startsWith("vscode-remote://")) {
      const authority = e.remoteAuthority ?? safeDecode(new URL(uri).host);
      let remotePath = "/";
      try {
        remotePath = safeDecode(new URL(uri).pathname);
      } catch {
        /* keep "/" */
      }
      items.push({
        uri,
        kind,
        icon: Icon.Folder,
        title: basename(remotePath) || remotePath,
        subtitle: dirname(remotePath),
        tag: formatAuthority(authority),
        keywords: [...authority.split("+"), ...remotePath.split("/"), ...(e.label ? [e.label] : [])],
        remote: true,
      });
    }
    // other schemes (vscode-vfs://, etc.) are skipped
  }
  return items;
}

function openLocal(path: string, newWindow = false) {
  const args = ["-a", appName];
  if (newWindow) args.push("-n");
  args.push(path);
  execFile("/usr/bin/open", args);
}

// Same approach as the original extension on macOS:
// vscode-remote://... -> <scheme>://vscode-remote/..., windowId=_blank forces a new window.
function openRemote(uri: string, newWindow: boolean) {
  const url = new URL(uri.replace("vscode-remote://", `${scheme}://vscode-remote/`));
  if (newWindow) url.searchParams.set("windowId", "_blank");
  else url.searchParams.delete("windowId");
  execFile("/usr/bin/open", [url.toString()]);
}

export default function Command() {
  const { data, isLoading, permissionView } = useSQL<Row>(dbPath, QUERY);
  if (permissionView) return permissionView;

  const items = toItems(data);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search recent projects...">
      {items.length === 0 && !isLoading ? (
        <List.EmptyView title="No recent projects" description={`Nothing found in ${dbPath}`} />
      ) : null}
      {items.map((item) => (
        <List.Item
          key={item.uri}
          title={item.title}
          subtitle={item.subtitle}
          icon={item.icon}
          accessories={item.tag ? [{ tag: item.tag }] : []}
          keywords={item.keywords}
          actions={
            <ActionPanel>
              {item.remote ? (
                <>
                  <Action title={`Open in ${appName}`} icon="action-icon.png" onAction={() => openRemote(item.uri, false)} />
                  <Action
                    title="Open in New Window"
                    icon={Icon.NewDocument}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    onAction={() => openRemote(item.uri, true)}
                  />
                </>
              ) : (
                <>
                  <Action
                    title={`Open in ${appName}`}
                    icon={appIcon}
                    onAction={() => openLocal(item.localPath!)}
                  />
                  <Action
                    title="Open in New Window"
                    icon={Icon.NewDocument}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    onAction={() => openLocal(item.localPath!, true)}
                  />
                  <Action.ShowInFinder path={item.localPath!} shortcut={{ modifiers: ["cmd"], key: "f" }} />
                </>
              )}
              <Action.CopyToClipboard
                title={item.remote ? "Copy URI" : "Copy Path"}
                content={item.remote ? item.uri : item.localPath!}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
