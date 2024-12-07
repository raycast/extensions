import {
  ActionPanel,
  Action,
  Icon,
  List,
  Cache,
  getPreferenceValues,
  LaunchType,
  launchCommand,
  Color,
  Keyboard,
} from "@raycast/api";
import path from "path";
import { useEffect, useState } from "react";
import { editFile, getIcon, getMarkdownFiles, MarkdownFile } from "./slides";
import { useCachedState } from "@raycast/utils";

const preferences = getPreferenceValues<Preferences>();
const cache = new Cache();

export default function Command() {
  const slidesDir = preferences.slidesDirectory.replace("~", process.env.HOME || "");
  const [markdownFiles, setMarkdownFiles] = useCachedState<MarkdownFile[]>("markdownFiles", []);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedFile, setSelectedFile] = useCachedState<string | null>("selectedFile", null);

  useEffect(() => {
    setIsLoading(true);
    setMarkdownFiles(getMarkdownFiles(slidesDir));
    const cachedFile = cache.get("selectedSlides");
    setSelectedFile(cachedFile as string | null);
    setIsLoading(false);
  }, [slidesDir]);

  const refreshFiles = () => {
    setIsLoading(true);
    setMarkdownFiles(getMarkdownFiles(slidesDir));
    setIsLoading(false);
  };

  return (
    <List
      isShowingDetail
      isLoading={isLoading}
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
          key={file.path}
          icon={getIcon(file.icon as keyof typeof Icon)}
          title={file.headline || path.basename(file.path, ".md")}
          subtitle={file.name}
          accessories={
            file.name === selectedFile
              ? [{ icon: { tintColor: Color.Yellow, source: Icon.Star }, tooltip: "Selected File" }]
              : []
          }
          detail={
            <List.Item.Detail
              markdown={file.content}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="File" text={file.name} />
                  <List.Item.Detail.Metadata.Label
                    title="Created At"
                    text={new Date(file.creationTime).toLocaleDateString()}
                  />
                  <List.Item.Detail.Metadata.Label title="Page Count" text={String(file.pageCount)} />
                  {file.icon && (
                    <List.Item.Detail.Metadata.Label
                      title="Icon"
                      text={String(file.icon)}
                      icon={getIcon(file.icon as keyof typeof Icon)}
                    />
                  )}
                  {file.isPaginated && <List.Item.Detail.Metadata.Label title="Pagination" text="Enabled" />}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action
                title="Select File"
                icon={Icon.Download}
                onAction={() => {
                  cache.set("selectedSlides", file.name);
                  setSelectedFile(file.path);
                  launchCommand({
                    name: "preview-markdown-slides",
                    type: LaunchType.UserInitiated,
                    context: { file: file.name },
                  });
                }}
              />
              <Action
                title={"Edit File"}
                icon={Icon.Pencil}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
                onAction={() => editFile(file.path)}
              />
              <Action.OpenWith path={file.path} />
              <Action.ShowInFinder path={file.path} shortcut={{ modifiers: ["cmd"], key: "f" }} />
              <Action.Trash paths={file.path} onTrash={refreshFiles} shortcut={Keyboard.Shortcut.Common.Remove} />
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
