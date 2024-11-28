import { Action, Icon } from "@raycast/api";
import { downloadMedia } from "../lib/download";
import { GeneratedImage } from "../lib/image";

export const DownloadImageAction: React.FC<{ image: GeneratedImage }> = ({ image }) => {
  const { url, config, id } = image;
  const filename = `${config.prompt}-${id}`;
  return (
    <Action
      title="Download"
      icon={{ source: Icon.Download }}
      shortcut={{ modifiers: ["cmd"], key: "d" }}
      onAction={() => {
        downloadMedia(url, filename);
      }}
    />
  );
};
