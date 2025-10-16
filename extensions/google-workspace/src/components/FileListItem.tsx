import { Action, ActionPanel, Color, Icon, List, getPreferenceValues } from "@raycast/api";
import { format } from "date-fns";
import { File } from "../api/getFiles";
import { getFileIconLink, humanFileSize } from "../helpers/files";

type FileListItemProps = {
  file: File;
  email?: string;
};

export default function FileListItem({ file, email }: FileListItemProps) {
  const { displayFilePath } = getPreferenceValues();
  const modifiedTime = new Date(file.modifiedTime);

  const accessories: List.Item.Accessory[] = [
    {
      date: new Date(modifiedTime),
      tooltip: `Updated: ${format(modifiedTime, "EEEE d MMMM yyyy 'at' HH:mm")}`,
    },
  ];

  if (displayFilePath && file.filePath) {
    accessories.unshift({
      icon: { source: Icon.Folder, tintColor: Color.SecondaryText },
      tooltip: file.filePath,
    });
  }

  if (file.starred) {
    accessories.unshift({
      icon: { source: Icon.Star, tintColor: Color.Yellow },
      tooltip: "Starred",
    });
  }

  return (
    <List.Item
      key={file.id}
      title={file.name}
      icon={{ source: getFileIconLink(file.mimeType), fallback: "google-drive.png" }}
      {...(file.size ? { subtitle: humanFileSize(parseInt(file.size)) } : {})}
      accessories={accessories}
      actions={
        <ActionPanel title={file.name}>
          <Action.OpenInBrowser
            title="Open in Browser"
            url={`${file.webViewLink}${
              email && file.mimeType !== "application/vnd.google-apps.folder" ? `&authuser=${email}` : ""
            }`}
          />
          <Action.OpenWith
            title="Open With"
            path={`${file.webViewLink}${
              email && file.mimeType !== "application/vnd.google-apps.folder" ? `&authuser=${email}` : ""
            }`}
          />
          {file.parents && file.parents.length > 0 ? (
            <Action.OpenInBrowser
              title="Open File Location in Browser"
              icon={Icon.Folder}
              // As of September 2020, a file can have exactly one parent folder
              // It's safe to assume the corresponding folder will be the first one
              // https://developers.google.com/drive/api/guides/ref-single-parent
              url={`https://drive.google.com/drive/folders/${file.parents[0]}`}
            />
          ) : null}

          {file.webContentLink ? (
            <Action.OpenInBrowser
              title="Download in Browser"
              icon={Icon.Download}
              shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
              url={`${file.webContentLink}${email ? `&authuser=${email}` : ""}`}
            />
          ) : null}

          <ActionPanel.Section>
            <Action.CopyToClipboard
              icon={Icon.Clipboard}
              content={file.name}
              title="Copy File Name"
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />

            <Action.CopyToClipboard
              icon={Icon.Clipboard}
              content={file.webViewLink}
              title="Copy File URL"
              shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
            />

            <Action.CopyToClipboard
              content={`[${file.name}](${file.webViewLink})`}
              title="Copy Markdown Link"
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            />

            <Action.CopyToClipboard
              content={{
                html: `<a href="${file.webViewLink}" title="${file.name}">${file.name}</a>`,
                text: file.name,
              }}
              title="Copy HTML Link"
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
