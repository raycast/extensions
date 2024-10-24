import {
  ActionPanel,
  Action,
  Icon,
  List,
  Cache,
  getPreferenceValues,
  LaunchType,
  launchCommand,
  Toast,
  showToast,
} from "@raycast/api";
import fs from "fs";
import path from "path";
import { useState, useEffect } from "react";

interface Preferences {
  slidesDirectory: string;
}

const preferences = getPreferenceValues<Preferences>();
const cache = new Cache();

function getMarkdownFiles(directory: string): string[] {
  if (!fs.existsSync(directory)) {
    showToast({
      style: Toast.Style.Failure,
      title: "Directory not found",
      message: "Configured slides path: " + directory,
      primaryAction: {
        title: "Create Directory",
        onAction() {
          if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory, { recursive: true });
            showToast({ title: "Created slides directory" });
          }
        },
      },
    });
    return [];
  }
  const files = fs.readdirSync(directory);
  return files.filter((file) => path.extname(file).toLowerCase() === ".md");
}

export default function Command() {
  const slidesDir = preferences.slidesDirectory.replace("~", process.env.HOME || "");
  const [markdownFiles, setMarkdownFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  useEffect(() => {
    setMarkdownFiles(getMarkdownFiles(slidesDir));
    const cachedFile = cache.get("selectedSlides");
    setSelectedFile(cachedFile as string | null);
  }, [slidesDir]);

  const refreshFiles = () => {
    setMarkdownFiles(getMarkdownFiles(slidesDir));
  };

  return (
    <List
      actions={
        !markdownFiles.length ? (
          <ActionPanel>
            <Action
              title="Create Presentation"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              onAction={() => launchCommand({ name: "create-markdown-presentation", type: LaunchType.UserInitiated })}
            />
          </ActionPanel>
        ) : (
          []
        )
      }
    >
      {markdownFiles.map((file) => (
        <List.Item
          key={file}
          icon={file === selectedFile ? Icon.Checkmark : Icon.Document}
          title={path.basename(file, ".md")}
          subtitle={file}
          accessories={file === selectedFile ? [{ icon: Icon.Star, tooltip: "Selected File" }] : []}
          actions={
            <ActionPanel>
              <Action
                title="Select File"
                icon={Icon.Download}
                onAction={() => {
                  cache.set("selectedSlides", file);
                  setSelectedFile(file);
                  launchCommand({ name: "preview-markdown-slides", type: LaunchType.UserInitiated, context: { file } });
                }}
              />
              <Action.OpenWith path={path.join(slidesDir, file)} />
              <Action.ShowInFinder path={path.join(slidesDir, file)} shortcut={{ modifiers: ["cmd"], key: "f" }} />
              <Action.Trash
                paths={path.join(slidesDir, file)}
                onTrash={refreshFiles}
                shortcut={{ modifiers: ["cmd"], key: "backspace" }}
              />
              <ActionPanel.Section>
                <Action.ShowInFinder
                  title="Open Slides Directory"
                  icon={Icon.Folder}
                  path={slidesDir}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
