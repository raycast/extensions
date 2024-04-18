import { Action, Icon } from "@raycast/api";
import { downloadMedia } from "../lib/download";

export const DownloadImageAction: React.FC<{ url: string; filename: string; title: string }> = ({
  url,
  filename,
  title,
}) => {
  return (
    <Action
      title={title}
      icon={{ source: Icon.Download }}
      shortcut={{ modifiers: ["cmd"], key: "d" }}
      onAction={() => {
        downloadMedia(url, filename);
      }}
    />
  );
};
