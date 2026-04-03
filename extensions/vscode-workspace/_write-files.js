const fs = require("fs");
const path = require("path");
const base = path.join(
  "C:",
  "Users",
  "mikan",
  "Documents",
  "extensions",
  "vscode-workspace",
  "src",
);
const libDir = path.join(base, "lib");
if (!fs.existsSync(libDir)) fs.mkdirSync(libDir, { recursive: true });

// Remove unwanted files
for (const f of ["workspace-discovery.ts", "vscode-instance.ts"]) {
  const p = path.join(libDir, f);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

fs.writeFileSync(
  path.join(libDir, "types.ts"),
  `export type FileEntry = {
  fileUri: string;
};

export type FolderEntry = {
  folderUri: string;
};

export type WorkspaceEntry = {
  workspace: {
    configPath: string;
  };
};

export type RemoteEntry = {
  folderUri: string;
  remoteAuthority: string;
  label: string;
};

export type RemoteWorkspaceEntry = {
  workspace: {
    configPath: string;
  };
  remoteAuthority: string;
  label?: string;
};

export type EntryLike = FolderEntry | FileEntry | WorkspaceEntry | RemoteEntry | RemoteWorkspaceEntry;

export type RecentEntries = {
  entries: string;
};

export const EntryType = {
  Workspaces: "Workspaces",
  Folders: "Folders",
  RemoteFolders: "Remote Folders",
  RemoteWorkspace: "Remote Workspace",
  Files: "Files",
  AllTypes: "All Types",
} as const;

export type EntryType = (typeof EntryType)[keyof typeof EntryType];
`,
);

fs.writeFileSync(
  path.join(libDir, "preferences.ts"),
  `import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues<ExtensionPreferences>();

export const build = preferences.build;
`,
);

fs.writeFileSync(
  path.join(libDir, "utils.ts"),
  `import { existsSync } from "fs";
import { URL } from "url";
import {
  EntryLike,
  EntryType,
  FileEntry,
  FolderEntry,
  RemoteEntry,
  RemoteWorkspaceEntry,
  WorkspaceEntry,
} from "./types";

export const isWin = process.platform === "win32";
export const isMac = process.platform === "darwin";

export function isFileEntry(entry: EntryLike): entry is FileEntry {
  const { fileUri } = entry as FileEntry;
  if (fileUri === undefined) return false;
  try {
    const fileUrl = new URL(fileUri);
    return existsSync(fileUrl) && fileUri.indexOf(".code-workspace") === -1;
  } catch {
    return false;
  }
}

export function isFolderEntry(entry: EntryLike): entry is FolderEntry {
  const { folderUri } = entry as FolderEntry;
  if (folderUri === undefined) return false;
  try {
    const folderUrl = new URL(folderUri);
    return existsSync(folderUrl);
  } catch {
    return false;
  }
}

export function isWorkspaceEntry(entry: EntryLike): entry is WorkspaceEntry {
  const { workspace } = entry as WorkspaceEntry;
  if (workspace === undefined) return false;
  try {
    const configUrl = new URL(workspace.configPath);
    return existsSync(configUrl) && workspace.configPath.indexOf(".code-workspace") !== -1;
  } catch {
    return false;
  }
}

export function isRemoteEntry(entry: EntryLike): entry is RemoteEntry {
  const { folderUri, remoteAuthority } = entry as RemoteEntry;
  return folderUri !== undefined && remoteAuthority !== undefined;
}

export function isRemoteWorkspaceEntry(entry: EntryLike): entry is RemoteWorkspaceEntry {
  const { workspace, remoteAuthority } = entry as RemoteWorkspaceEntry;
  return workspace !== undefined && remoteAuthority !== undefined;
}

export function filterEntriesByType(filter: EntryType | null) {
  switch (filter) {
    case "All Types":
      return () => true;
    case "Workspaces":
      return isWorkspaceEntry;
    case "Folders":
      return isFolderEntry;
    case "Remote Folders":
      return isRemoteEntry;
    case "Remote Workspace":
      return isRemoteWorkspaceEntry;
    case "Files":
      return isFileEntry;
    default:
      return () => false;
  }
}
`,
);

fs.writeFileSync(
  path.join(libDir, "editor.ts"),
  `import { Application, getApplications } from "@raycast/api";
import path from "path";
import { isMac } from "./utils";

const bundleIdMap: Record<string, { macos: string; windows: { name: string; exe: string } }> = {
  Antigravity: { macos: "com.google.antigravity", windows: { name: "Antigravity", exe: "Antigravity.exe" } },
  Code: { macos: "com.microsoft.VSCode", windows: { name: "Visual Studio Code", exe: "Code.exe" } },
  "Code - Insiders": {
    macos: "com.microsoft.VSCodeInsiders",
    windows: { name: "Visual Studio Code - Insiders", exe: "Code - Insiders.exe" },
  },
  Cursor: { macos: "com.todesktop.230313mzl4w4u92", windows: { name: "Cursor", exe: "Cursor.exe" } },
  Kiro: { macos: "dev.kiro.desktop", windows: { name: "Kiro", exe: "Kiro.exe" } },
  Positron: { macos: "com.rstudio.positron", windows: { name: "Positron", exe: "Positron.exe" } },
  Trae: { macos: "com.trae.app", windows: { name: "Trae", exe: "Trae.exe" } },
  "Trae CN": { macos: "cn.trae.app", windows: { name: "Trae CN", exe: "Trae - CN.exe" } },
  VSCodium: { macos: "com.vscodium", windows: { name: "VSCodium", exe: "VSCodium.exe" } },
  "VSCodium - Insiders": {
    macos: "com.vscodium.VSCodiumInsiders",
    windows: { name: "VSCodium - Insiders", exe: "VSCodium - Insiders.exe" },
  },
  Windsurf: { macos: "com.exafunction.windsurf", windows: { name: "Windsurf", exe: "Windsurf.exe" } },
  Lingma: { macos: "com.aliyun.lingma.ide", windows: { name: "Lingma", exe: "Lingma.exe" } },
};

export async function getEditorApplication(buildName: string): Promise<Application | undefined> {
  const apps = await getApplications();
  const bundleId = bundleIdMap[buildName];
  if (isMac) {
    if (bundleId) {
      const app = apps.find((a) => a.bundleId === bundleId.macos);
      if (app) return app;
    }
  } else {
    const app = apps.find((a) => {
      const isNameMatch = a.name === bundleId.windows.name;
      const exeFromPath = path.basename(a.path);
      const isExeMatch = exeFromPath === bundleId.windows.exe;
      return isNameMatch || isExeMatch;
    });
    if (app) return app;
  }
  return undefined;
}
`,
);

fs.writeFileSync(
  path.join(libDir, "db.ts"),
  `import { useSQL } from "@raycast/utils";
import fs from "fs";
import { homedir } from "os";
import { EntryLike, RecentEntries } from "./types";
import { isWin } from "./utils";
import { build } from "./preferences";

const buildSchemes: Record<string, string> = {
  Antigravity: "antigravity",
  Code: "vscode",
  "Code - Insiders": "vscode-insiders",
  Cursor: "cursor",
  Kiro: "kiro",
  VSCodium: "vscode-oss",
  Positron: "positron",
  Windsurf: "windsurf",
  Trae: "trae",
  "Trae CN": "trae-cn",
  Lingma: "lingma",
};

function getBuildName(): string {
  return build;
}

function getDBPath() {
  const buildName = getBuildName();
  if (isWin) {
    return homedir() + "\\\\AppData\\\\Roaming\\\\" + buildName + "\\\\User\\\\globalStorage\\\\state.vscdb";
  }
  return homedir() + "/Library/Application Support/" + buildName + "/User/globalStorage/state.vscdb";
}

export function getBuildScheme(): string {
  const scheme = buildSchemes[getBuildName()] as string | undefined;
  if (!scheme || scheme.length <= 0) return buildSchemes.Code;
  return scheme;
}

export function useRecentEntries() {
  const dbPath = getDBPath();

  if (!fs.existsSync(dbPath)) {
    return { data: undefined, isLoading: false, error: true as const };
  }

  const { data, isLoading, revalidate } = useSQL<RecentEntries>(
    dbPath,
    "SELECT json_extract(value, '$.entries') as entries FROM ItemTable WHERE key = 'history.recentlyOpenedPathsList'",
  );

  const entries = data && data.length ? data[0].entries : undefined;
  const parsedEntries = entries ? (JSON.parse(entries) as EntryLike[]) : undefined;

  return { data: parsedEntries, isLoading, revalidate };
}
`,
);

fs.writeFileSync(
  path.join(base, "search-workspace.tsx"),
  `import { Action, ActionPanel, Icon, List, open } from "@raycast/api";
import { basename, dirname } from "path";
import { useEffect, useState } from "react";
import { fileURLToPath } from "url";
import { useRecentEntries, getBuildScheme } from "./lib/db";
import { build } from "./lib/preferences";
import { EntryType, EntryLike } from "./lib/types";
import {
  isFileEntry,
  isFolderEntry,
  isRemoteEntry,
  isRemoteWorkspaceEntry,
  isWorkspaceEntry,
  filterEntriesByType,
} from "./lib/utils";
import { getEditorApplication } from "./lib/editor";

export default function Command() {
  const { data, isLoading, error } = useRecentEntries();
  const [type, setType] = useState<EntryType | null>(null);

  if (error) {
    return (
      <List>
        <List.EmptyView
          title="Failed to load recent projects"
          description={\`Could not read the \${build} state database. Make sure \${build} is installed.\`}
          icon={Icon.ExclamationMark}
        />
      </List>
    );
  }

  const filtered = data?.filter(filterEntriesByType(type)) ?? [];

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search recent projects..."
      searchBarAccessory={<EntryTypeDropdown onChange={setType} />}
    >
      {filtered.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No recent projects found"
          description="Open some projects in VS Code first"
          icon={Icon.Folder}
        />
      ) : (
        filtered.map((entry: EntryLike, index: number) => (
          <EntryItem key={index} entry={entry} />
        ))
      )}
    </List>
  );
}

function EntryTypeDropdown(props: { onChange: (type: EntryType) => void }) {
  return (
    <List.Dropdown
      tooltip="Filter project types"
      defaultValue={EntryType.AllTypes}
      storeValue
      onChange={(value) => props.onChange(value as EntryType)}
    >
      <List.Dropdown.Item title="All Types" value="All Types" />
      <List.Dropdown.Section>
        {Object.values(EntryType)
          .filter((key) => key !== "All Types")
          .sort()
          .map((key) => (
            <List.Dropdown.Item key={key} title={key} value={key} />
          ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

function EntryItem(props: { entry: EntryLike }) {
  if (isWorkspaceEntry(props.entry)) {
    return (
      <LocalItem
        uri={props.entry.workspace.configPath}
        entry={props.entry}
      />
    );
  } else if (isFolderEntry(props.entry)) {
    return <LocalItem uri={props.entry.folderUri} entry={props.entry} />;
  } else if (isRemoteEntry(props.entry)) {
    return (
      <RemoteItem
        uri={props.entry.folderUri}
        label={props.entry.label}
        entry={props.entry}
      />
    );
  } else if (isRemoteWorkspaceEntry(props.entry)) {
    return (
      <RemoteItem
        uri={props.entry.workspace.configPath}
        label={props.entry.label || "/"}
        entry={props.entry}
      />
    );
  } else if (isFileEntry(props.entry)) {
    return <LocalItem uri={props.entry.fileUri} entry={props.entry} />;
  } else {
    return null;
  }
}

function LocalItem(props: { uri: string; entry: EntryLike }) {
  const name = decodeURIComponent(basename(props.uri));
  const path = fileURLToPath(props.uri);
  const subtitle = dirname(path);

  const [editorApp, setEditorApp] = useState<
    Awaited<ReturnType<typeof getEditorApplication>>
  >(undefined);

  useEffect(() => {
    getEditorApplication(build).then(setEditorApp);
  }, []);

  const handleOpen = async () => {
    if (editorApp) {
      await open(path, editorApp);
    } else {
      await open(path);
    }
  };

  return (
    <List.Item
      title={name}
      subtitle={subtitle}
      icon={{ fileIcon: path }}
      accessories={
        isFolderEntry(props.entry)
          ? [{ icon: Icon.Folder }]
          : isWorkspaceEntry(props.entry)
            ? [{ icon: Icon.Document }]
            : [{ icon: Icon.File }]
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title={\`Open in \${build}\`}
              icon={editorApp ? { fileIcon: editorApp.path } : Icon.Globe}
              onAction={handleOpen}
            />
            <Action.ShowInFinder path={path} />
            <Action.OpenWith
              path={path}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Name"
              content={name}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
            <Action.CopyToClipboard
              title="Copy Path"
              content={path}
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function RemoteItem(props: { uri: string; label: string; entry: EntryLike }) {
  const name = decodeURI(basename(props.uri));
  const scheme = getBuildScheme();
  const uri = props.uri.replace(
    "vscode-remote://",
    \`\${scheme}://vscode-remote/\`,
  );

  return (
    <List.Item
      title={name}
      subtitle={props.label || "/"}
      icon={Icon.Globe}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title={\`Open in \${build}\`} url={uri} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Name" content={name} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
`,
);

// Verify
const files = fs.readdirSync(libDir);
console.log("lib/ files:", files);
console.log(
  "search-workspace.tsx first line:",
  fs
    .readFileSync(path.join(base, "search-workspace.tsx"), "utf8")
    .split("\n")[0],
);
