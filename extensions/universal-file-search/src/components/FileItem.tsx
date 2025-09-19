import { List, ActionPanel, Action, Icon, showHUD } from "@raycast/api";
import { FileResult } from "../types";
import { homedir } from "os";
import { dirname } from "path";

interface FileItemProps {
  file: FileResult;
  hasSearched?: boolean;
  onSearch?: () => void;
  onScopeChange?: (scope: string) => void;
  onModeChange?: (mode: string) => void;
  customSearchPaths?: string;
}

export function FileItem({
  file,
  hasSearched,
  onSearch,
  onModeChange,
}: FileItemProps) {
  // Get recommended apps for file type
  const getSmartOpenOptions = () => {
    const ext = file.extension.toLowerCase();
    const options = [];

    // Known binary/media formats - provide specific apps
    // Images
    if (
      [
        "png",
        "jpg",
        "jpeg",
        "gif",
        "svg",
        "webp",
        "ico",
        "bmp",
        "tiff",
        "heic",
        "raw",
      ].includes(ext)
    ) {
      options.push({ app: "Preview", icon: Icon.Image });
    }
    // PDF
    else if (ext === "pdf") {
      options.push({ app: "Preview", icon: Icon.Document });
    }
    // Video
    else if (
      [
        "mp4",
        "mov",
        "avi",
        "mkv",
        "wmv",
        "flv",
        "webm",
        "m4v",
        "mpg",
        "mpeg",
      ].includes(ext)
    ) {
      options.push({ app: "QuickTime Player", icon: Icon.Video });
      options.push({ app: "VLC", icon: Icon.Video });
    }
    // Audio
    else if (
      [
        "mp3",
        "wav",
        "flac",
        "m4a",
        "aac",
        "ogg",
        "wma",
        "alac",
        "aiff",
      ].includes(ext)
    ) {
      options.push({ app: "Music", icon: Icon.Microphone });
      options.push({ app: "QuickTime Player", icon: Icon.Microphone });
    }
    // Archives
    else if (
      ["zip", "tar", "gz", "bz2", "7z", "rar", "dmg", "pkg"].includes(ext)
    ) {
      options.push({ app: "Archive Utility", icon: Icon.Download });
    }
    // Office documents
    else if (["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(ext)) {
      options.push({ app: "Microsoft Word", icon: Icon.Document });
      options.push({ app: "Pages", icon: Icon.Document });
    }
    // Default: treat as text file (for any unknown extension)
    else {
      // For any file with extension or without, assume it could be text
      options.push({ app: "Visual Studio Code", icon: Icon.Code });
      options.push({ app: "TextEdit", icon: Icon.TextDocument });
      // Also add Terminal for potential scripts
      if (
        [
          "sh",
          "bash",
          "zsh",
          "fish",
          "command",
          "tool",
          "run",
          "exec",
        ].includes(ext) ||
        !ext
      ) {
        options.push({ app: "Terminal", icon: Icon.Terminal });
      }
    }

    return options;
  };

  const smartApps = file.isDirectory ? [] : getSmartOpenOptions();
  // �����(�>:
  const home = homedir();
  const displayPath = file.path.startsWith(home)
    ? file.path.replace(home, "~")
    : file.path;
  const directory = dirname(displayPath);

  // <��'
  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // <�
  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
  };

  // �և��
  const getIcon = () => {
    if (file.isDirectory) return Icon.Folder;

    const ext = file.extension.toLowerCase();
    const iconMap: Record<string, unknown> = {
      // �c
      pdf: Icon.Document,
      doc: Icon.Document,
      docx: Icon.Document,
      txt: Icon.Text,
      md: Icon.Text,

      // �G
      png: Icon.Image,
      jpg: Icon.Image,
      jpeg: Icon.Image,
      gif: Icon.Image,
      svg: Icon.Image,

      // �
      js: Icon.Code,
      ts: Icon.Code,
      jsx: Icon.Code,
      tsx: Icon.Code,
      py: Icon.Code,
      java: Icon.Code,
      cpp: Icon.Code,
      c: Icon.Code,
      h: Icon.Code,
      swift: Icon.Code,

      // �)��
      zip: Icon.Download,
      tar: Icon.Download,
      gz: Icon.Download,
      rar: Icon.Download,

      // Ƒ
      mp4: Icon.Video,
      mov: Icon.Video,
      avi: Icon.Video,
      mkv: Icon.Video,

      // �
      mp3: Icon.Microphone,
      wav: Icon.Microphone,
      flac: Icon.Microphone,
      m4a: Icon.Microphone,
    };

    return iconMap[ext] || Icon.Document;
  };

  return (
    <List.Item
      title={file.name}
      subtitle={directory}
      icon={getIcon()}
      quickLook={{ path: file.path }}
      accessories={[
        { text: formatSize(file.size) },
        {
          text: formatDate(file.modifiedDate),
          tooltip: file.modifiedDate.toLocaleString(),
        },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Open
              title="Open"
              target={file.path}
              shortcut={{ modifiers: [], key: "return" }}
            />
            <Action.ShowInFinder
              title="Reveal in Finder"
              path={file.path}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
            {/* Only show re-search option after initial search */}
            {hasSearched && (
              <Action
                title={onSearch ? "Search Again" : "Searching…"}
                onAction={onSearch || (() => {})}
                shortcut={{ modifiers: ["cmd"], key: "s" }}
                icon={Icon.MagnifyingGlass}
              />
            )}
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Path"
              content={file.path}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
              onCopy={() => showHUD("Path copied to clipboard")}
            />
            <Action.CopyToClipboard
              title="Copy Name"
              content={file.name}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              onCopy={() => showHUD("Name copied to clipboard")}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action.OpenWith
              title="Open With…"
              path={file.path}
              shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
            />
            {/* For unknown file types, provide text editor options */}
            {!file.isDirectory && smartApps.length > 0 && (
              <>
                <Action.Open
                  title="Open with VS Code"
                  target={file.path}
                  application="Visual Studio Code"
                  icon={Icon.Code}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                />
                <Action.Open
                  title="Open with Textedit"
                  target={file.path}
                  application="TextEdit"
                  icon={Icon.TextDocument}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                />
              </>
            )}
            {!file.isDirectory && (
              <Action.ToggleQuickLook
                title="Quick Look"
                shortcut={{ modifiers: [], key: "space" }}
              />
            )}
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action.Trash title="Move to Trash" paths={[file.path]} />
          </ActionPanel.Section>

          {onModeChange && (
            <ActionPanel.Section title="Search Mode">
              <Action
                title="Toggle Search Mode (cmd+m)"
                onAction={() => {
                  // Just trigger the toggle
                  onModeChange("toggle");
                }}
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "m" }}
              />
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}
