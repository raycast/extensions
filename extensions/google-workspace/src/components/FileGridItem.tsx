import { Action, ActionPanel, Grid } from "@raycast/api";
import { formatDistanceToNow } from "date-fns";
import { File } from "../api/getFiles";

function getThumbnailLink(file: File, size: number = 128) {
  // TODO: use cache for quick thumbnail loading
  // first if has a thumbnail link, return it
  if (file.thumbnailLink) {
    // resize the thumbnail to the desired size
    // sample: https://lh3.googleusercontent.com/drive-storage/GUXAiXA=s220
    return file.thumbnailLink.replace(/=s\d+/, `=s${size}`);
  }
  // if not, return the icon link, replace the size with the desired size
  // https://drive-thirdparty.googleusercontent.com/16/type/application/vnd.google-apps.folder+shared
  // https://drive-thirdparty.googleusercontent.com/16/type/application/vnd.google-apps.folder
  const iconLink = file.iconLink?.replace(/\/\d+\//, `/${size}/`);
  return iconLink || "";
}

export function FileGridItem({ file, email }: { file: File; email: string }) {
  const subtitle = formatDistanceToNow(new Date(file.modifiedTime), { addSuffix: true });

  return (
    <Grid.Item
      content={getThumbnailLink(file)}
      title={file.name}
      subtitle={subtitle}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={file.webViewLink} />
          {file.webContentLink && (
            <Action.OpenInBrowser title="Download File" url={`${file.webContentLink}&access_token=${email}`} />
          )}
        </ActionPanel>
      }
    />
  );
}
