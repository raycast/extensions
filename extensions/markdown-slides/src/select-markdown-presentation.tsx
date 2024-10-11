import { ActionPanel, Action, Icon, List, Cache, getPreferenceValues, LaunchType, launchCommand } from "@raycast/api";
import fs from "fs";
import path from "path";
import { useState, useEffect } from "react";

interface Preferences {
  slidesDirectory: string;
}

const preferences = getPreferenceValues<Preferences>();
const cache = new Cache();

function getMarkdownFiles(directory: string): string[] {
  const files = fs.readdirSync(directory);
  return files.filter((file) => path.extname(file).toLowerCase() === ".md");
}

export default function Command() {
  const slidesDir = preferences.slidesDirectory.replace("~", process.env.HOME || "");
  const [markdownFiles, setMarkdownFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  useEffect(() => {
    setMarkdownFiles(getMarkdownFiles(slidesDir));
    const cachedFile = cache.get('selectedSlides');
    setSelectedFile(cachedFile as string | null);
  }, [slidesDir]);

  const refreshFiles = () => {
    setMarkdownFiles(getMarkdownFiles(slidesDir));
  };

  return (
    <List>
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
                  cache.set('selectedSlides', file);
                  setSelectedFile(file);
                  launchCommand({ name: "preview-markdown-slides", type: LaunchType.UserInitiated, context: { file } });
                }}
              />
              <Action.OpenWith path={path.join(slidesDir, file)} />
              <Action.ShowInFinder path={path.join(slidesDir, file)} />
              <Action.Trash
                paths={path.join(slidesDir, file)}
                onTrash={refreshFiles}
                shortcut={{ modifiers: ["cmd"], key: "backspace" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
