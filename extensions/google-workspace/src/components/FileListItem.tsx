import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { File } from "../api/getFiles";
import { downloadFile, getFileIconLink, getMimeTypeLabel, humanFileSize } from "../helpers/files";
import { formatDateTime, formatDuration } from "../helpers/formatters";

type FileListItemProps = {
  file: File;
  email?: string;
};

export default function FileListItem({ file, email }: FileListItemProps) {
  const createdTime = file.createdTime ? new Date(file.createdTime) : null;
  const modifiedByMeTime = file.modifiedByMeTime ? new Date(file.modifiedByMeTime) : null;
  const viewedByMeTime = file.viewedByMeTime ? new Date(file.viewedByMeTime) : null;
  const sharedWithMeTime = file.sharedWithMeTime ? new Date(file.sharedWithMeTime) : null;

  const photoTakenTime = file.imageMediaMetadata?.time
    ? (() => {
        try {
          const isoFormat = file.imageMediaMetadata.time
            .replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3")
            .replace(" ", "T");
          const date = new Date(isoFormat);
          return isNaN(date.getTime()) ? null : date;
        } catch {
          return null;
        }
      })()
    : null;

  const iconUrl = getFileIconLink(file.mimeType, 256);
  const markdown = `<img src="${iconUrl}" alt="${file.name}" width="185" />`;

  const detail = (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Name" text={file.name} />
          {file.filePath && <List.Item.Detail.Metadata.Label title="Where" text={file.filePath} />}
          <List.Item.Detail.Metadata.Label title="Type" text={getMimeTypeLabel(file.mimeType)} />
          {file.size && <List.Item.Detail.Metadata.Label title="Size" text={humanFileSize(parseInt(file.size))} />}
          {createdTime && <List.Item.Detail.Metadata.Label title="Created" text={formatDateTime(createdTime)} />}
          {modifiedByMeTime && (
            <List.Item.Detail.Metadata.Label title="Modified" text={formatDateTime(modifiedByMeTime)} />
          )}
          {viewedByMeTime && (
            <List.Item.Detail.Metadata.Label title="Last Opened" text={formatDateTime(viewedByMeTime)} />
          )}
          {sharedWithMeTime && (
            <List.Item.Detail.Metadata.Label title="Shared with Me" text={formatDateTime(sharedWithMeTime)} />
          )}

          {(file.imageMediaMetadata || file.videoMediaMetadata) && (
            <>
              <List.Item.Detail.Metadata.Separator />
              {file.imageMediaMetadata && (
                <>
                  {file.imageMediaMetadata.width && file.imageMediaMetadata.height && (
                    <List.Item.Detail.Metadata.Label
                      title="Dimensions"
                      text={`${file.imageMediaMetadata.width} × ${file.imageMediaMetadata.height}`}
                    />
                  )}
                  {file.imageMediaMetadata.cameraMake && (
                    <List.Item.Detail.Metadata.Label
                      title="Camera"
                      text={`${file.imageMediaMetadata.cameraMake}${file.imageMediaMetadata.cameraModel ? ` ${file.imageMediaMetadata.cameraModel}` : ""}`}
                    />
                  )}
                  {photoTakenTime && (
                    <List.Item.Detail.Metadata.Label title="Photo Taken" text={formatDateTime(photoTakenTime)} />
                  )}
                  {file.imageMediaMetadata.location &&
                    file.imageMediaMetadata.location.latitude &&
                    file.imageMediaMetadata.location.longitude && (
                      <List.Item.Detail.Metadata.Link
                        title="Location"
                        target={`https://www.google.com/maps?q=${file.imageMediaMetadata.location.latitude},${file.imageMediaMetadata.location.longitude}`}
                        text={`${file.imageMediaMetadata.location.latitude.toFixed(6)}, ${file.imageMediaMetadata.location.longitude.toFixed(6)}`}
                      />
                    )}
                </>
              )}
              {file.videoMediaMetadata && (
                <>
                  {file.videoMediaMetadata.width && file.videoMediaMetadata.height && (
                    <List.Item.Detail.Metadata.Label
                      title="Dimensions"
                      text={`${file.videoMediaMetadata.width} × ${file.videoMediaMetadata.height}`}
                    />
                  )}
                  {file.videoMediaMetadata.durationMillis && (
                    <List.Item.Detail.Metadata.Label
                      title="Duration"
                      text={formatDuration(file.videoMediaMetadata.durationMillis)}
                    />
                  )}
                </>
              )}
            </>
          )}

          {(file.owners || file.lastModifyingUser || file.shared) && (
            <>
              <List.Item.Detail.Metadata.Separator />
              {file.owners && file.owners.length > 0 && (
                <List.Item.Detail.Metadata.Label
                  title="Owner"
                  text={file.owners[0].displayName || file.owners[0].emailAddress || "Unknown"}
                />
              )}
              {file.lastModifyingUser && (
                <List.Item.Detail.Metadata.Label
                  title="Last Modified By"
                  text={file.lastModifyingUser.displayName || file.lastModifyingUser.emailAddress || "Unknown"}
                />
              )}
              {file.shared && (
                <List.Item.Detail.Metadata.TagList title="Sharing">
                  <List.Item.Detail.Metadata.TagList.Item text="Shared" color={Color.Blue} />
                  {file.viewersCanCopyContent === false && (
                    <List.Item.Detail.Metadata.TagList.Item text="Copy Protected" color={Color.Orange} />
                  )}
                </List.Item.Detail.Metadata.TagList>
              )}
            </>
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );

  return (
    <List.Item
      key={file.id}
      title={file.name}
      icon={{ source: getFileIconLink(file.mimeType), fallback: "google-drive.png" }}
      accessories={file.starred ? [{ icon: Icon.Star, tooltip: "Starred" }] : undefined}
      detail={detail}
      actions={
        <ActionPanel title={file.name}>
          <Action.OpenInBrowser
            url={`${file.webViewLink}${
              email && file.mimeType !== "application/vnd.google-apps.folder" ? `&authuser=${email}` : ""
            }`}
          />
          {file.parents && file.parents.length > 0 && (
            <Action.OpenInBrowser
              title="Reveal in Google Drive"
              // As of September 2020, a file can have exactly one parent folder
              // It's safe to assume the corresponding folder will be the first one
              // https://developers.google.com/drive/api/guides/ref-single-parent
              url={`https://drive.google.com/drive/folders/${file.parents[0]}`}
            />
          )}
          <Action.OpenWith
            // eslint-disable-next-line @raycast/prefer-title-case
            title="Open With"
            path={`${file.webViewLink}${
              email && file.mimeType !== "application/vnd.google-apps.folder" ? `&authuser=${email}` : ""
            }`}
            shortcut={Keyboard.Shortcut.Common.OpenWith}
          />

          {file.webContentLink && (
            <Action
              title="Download File"
              icon={Icon.Download}
              onAction={() => downloadFile(file)}
              shortcut={{
                macOS: { modifiers: ["shift", "cmd"], key: "d" },
                Windows: { modifiers: ["shift", "ctrl"], key: "d" },
              }}
            />
          )}

          <ActionPanel.Section>
            <Action.CopyToClipboard
              content={file.name}
              title="Copy File Name"
              shortcut={Keyboard.Shortcut.Common.CopyName}
            />

            <Action.CopyToClipboard
              content={file.webViewLink}
              title="Copy File URL"
              shortcut={{
                macOS: { modifiers: ["shift", "cmd"], key: "," },
                Windows: { modifiers: ["shift", "ctrl"], key: "," },
              }}
            />

            <Action.CopyToClipboard
              content={`[${file.name}](${file.webViewLink})`}
              title="Copy Markdown Link"
              shortcut={{
                macOS: { modifiers: ["shift", "cmd"], key: "." },
                Windows: { modifiers: ["shift", "ctrl"], key: "." },
              }}
            />

            <Action.CopyToClipboard
              content={{
                html: `<a href="${file.webViewLink}" title="${file.name}">${file.name}</a>`,
                text: file.name,
              }}
              title="Copy HTML Link"
              shortcut={{
                macOS: { modifiers: ["shift", "cmd"], key: "c" },
                Windows: { modifiers: ["shift", "ctrl"], key: "c" },
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
