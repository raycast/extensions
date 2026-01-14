import {
  Action,
  ActionPanel,
  type Application,
  getPreferenceValues,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { homedir } from "os";
import { join } from "path";

interface Preferences {
  directory: string;
  limit: string;
  editor?: Application;
  showPreview: boolean;
}

function getFileContent(path: string): string {
  try {
    const content = readFileSync(path, "utf-8").slice(0, 10000);
    const ext = path.split(".").pop()?.toLowerCase();
    const lang =
      ext === "json"
        ? "json"
        : ext === "ts" || ext === "tsx"
          ? "typescript"
          : ext === "js" || ext === "jsx"
            ? "javascript"
            : ext === "md"
              ? "markdown"
              : ext || "";
    // Use 4 backticks to handle files containing triple backticks
    return "````" + lang + "\n" + content + "\n````";
  } catch {
    return "*Unable to read file*";
  }
}

interface FileInfo {
  name: string;
  path: string;
  mtime: Date;
  isFile: boolean;
}

function expandPath(path: string): string {
  return path.replace(/^~/, homedir());
}

function getFileIcon(filename: string): Icon {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "md":
      return Icon.Document;
    case "json":
      return Icon.Code;
    case "ts":
    case "tsx":
    case "js":
    case "jsx":
      return Icon.Code;
    default:
      return Icon.Document;
  }
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const dir = expandPath(prefs.directory);
  const limit = Math.max(1, parseInt(prefs.limit, 10) || 10);

  if (!existsSync(dir)) {
    showToast({
      style: Toast.Style.Failure,
      title: "Directory not found",
      message: dir,
    });
    return (
      <List>
        <List.EmptyView
          icon={Icon.Warning}
          title="Directory not found"
          description={`The directory "${dir}" does not exist. Check your preferences.`}
        />
      </List>
    );
  }

  let files: FileInfo[] = [];
  try {
    files = readdirSync(dir)
      .filter((f) => !f.startsWith("."))
      .map((f) => {
        const path = join(dir, f);
        const stat = statSync(path);
        return { name: f, path, mtime: stat.mtime, isFile: stat.isFile() };
      })
      .filter((f) => f.isFile)
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
      .slice(0, limit);
  } catch (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Error reading directory",
      message: String(error),
    });
    return (
      <List>
        <List.EmptyView
          icon={Icon.Warning}
          title="Error reading directory"
          description={String(error)}
        />
      </List>
    );
  }

  if (files.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Folder}
          title="No files found"
          description={`No files in "${dir}"`}
        />
      </List>
    );
  }

  const showPreview = prefs.showPreview;

  return (
    <List
      searchBarPlaceholder="Filter recent plans..."
      isShowingDetail={showPreview}
    >
      {files.map((f) => (
        <List.Item
          key={f.path}
          icon={getFileIcon(f.name)}
          title={f.name}
          {...(!showPreview && { subtitle: f.mtime.toLocaleString() })}
          {...(!showPreview && { accessories: [{ text: timeAgo(f.mtime) }] })}
          {...(showPreview && {
            detail: (
              <List.Item.Detail
                markdown={getFileContent(f.path)}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Modified"
                      text={f.mtime.toLocaleString()}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Path"
                      text={f.path}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            ),
          })}
          actions={
            <ActionPanel>
              <Action.Open
                title="Open"
                target={f.path}
                {...(prefs.editor && { application: prefs.editor })}
              />
              <Action.OpenWith path={f.path} />
              <Action.ShowInFinder path={f.path} />
              <Action.CopyToClipboard
                title="Copy Path"
                content={f.path}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}
