import { Action, ActionPanel, Color, getSelectedFinderItems, Icon, List, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { formatBytes, formatDate, getFileIcon, getFileInfo } from "./utils";

export default function Command() {
  const {
    isLoading,
    data: fileInfo,
    error,
  } = usePromise(async () => {
    const items = await getSelectedFinderItems();
    if (items.length === 0) {
      throw new Error("No file selected. Please select a file in Finder first.");
    }
    return getFileInfo(items[0].path);
  });

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: error.message,
    });
  }

  return (
    <List isLoading={isLoading} isShowingDetail>
      {fileInfo && (
        <>
          <List.Section title="File Overview">
            <List.Item
              icon={{ source: getFileIcon(fileInfo), tintColor: Color.Blue }}
              title="File Info"
              subtitle={fileInfo.name}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="General Information" text="" />
                      <List.Item.Detail.Metadata.Label title="Name" text={fileInfo.name} />
                      <List.Item.Detail.Metadata.Label title="Type" text={fileInfo.type} />
                      <List.Item.Detail.Metadata.Label
                        title="Size"
                        text={`${formatBytes(fileInfo.size)} (${fileInfo.size.toLocaleString()} bytes)`}
                      />
                      <List.Item.Detail.Metadata.Label title="Extension" text={fileInfo.extension} />
                      {fileInfo.mimeType && (
                        <List.Item.Detail.Metadata.Label title="MIME Type" text={fileInfo.mimeType} />
                      )}
                      {fileInfo.dimensions && (
                        <List.Item.Detail.Metadata.Label title="Dimensions" text={fileInfo.dimensions} />
                      )}
                      {fileInfo.duration && (
                        <List.Item.Detail.Metadata.Label title="Duration" text={fileInfo.duration} />
                      )}

                      <List.Item.Detail.Metadata.Separator />

                      <List.Item.Detail.Metadata.Label title="Location" text="" />
                      <List.Item.Detail.Metadata.Label title="Path" text={fileInfo.path} />

                      <List.Item.Detail.Metadata.Separator />

                      <List.Item.Detail.Metadata.Label title="Timestamps" text="" />
                      <List.Item.Detail.Metadata.Label title="Created" text={formatDate(fileInfo.created)} />
                      <List.Item.Detail.Metadata.Label title="Modified" text={formatDate(fileInfo.modified)} />
                      <List.Item.Detail.Metadata.Label title="Accessed" text={formatDate(fileInfo.accessed)} />

                      <List.Item.Detail.Metadata.Separator />

                      <List.Item.Detail.Metadata.Label title="Permissions" text="" />
                      <List.Item.Detail.Metadata.Label title="Mode" text={fileInfo.permissions} />
                      {fileInfo.owner && <List.Item.Detail.Metadata.Label title="Owner" text={fileInfo.owner} />}
                      {fileInfo.group && <List.Item.Detail.Metadata.Label title="Group" text={fileInfo.group} />}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy File Path"
                    content={fileInfo.path}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.ShowInFinder path={fileInfo.path} shortcut={{ modifiers: ["cmd"], key: "f" }} />
                  <Action.OpenWith path={fileInfo.path} shortcut={{ modifiers: ["cmd"], key: "o" }} />
                  <Action.CopyToClipboard
                    title="Copy All Info"
                    content={`Name: ${fileInfo.name}
Path: ${fileInfo.path}
Type: ${fileInfo.type}
Size: ${formatBytes(fileInfo.size)}
Extension: ${fileInfo.extension}
Created: ${formatDate(fileInfo.created)}
Modified: ${formatDate(fileInfo.modified)}
Accessed: ${formatDate(fileInfo.accessed)}
Permissions: ${fileInfo.permissions}
Owner: ${fileInfo.owner}
Group: ${fileInfo.group}`}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                </ActionPanel>
              }
            />
          </List.Section>

          <List.Section title="Quick Stats">
            <List.Item
              icon={{ source: Icon.HardDrive, tintColor: Color.Orange }}
              title="Size"
              accessories={[{ text: formatBytes(fileInfo.size) }]}
            />
            <List.Item
              icon={{ source: Icon.Document, tintColor: Color.Purple }}
              title="Type"
              accessories={[{ text: fileInfo.type }]}
            />
            {fileInfo.dimensions && (
              <List.Item
                icon={{ source: Icon.Image, tintColor: Color.Magenta }}
                title="Dimensions"
                accessories={[{ text: fileInfo.dimensions }]}
              />
            )}
            {fileInfo.duration && (
              <List.Item
                icon={{ source: Icon.PlayFilled, tintColor: Color.Blue }}
                title="Duration"
                accessories={[{ text: fileInfo.duration }]}
              />
            )}
            <List.Item
              icon={{ source: Icon.Clock, tintColor: Color.Green }}
              title="Modified"
              accessories={[{ text: formatDate(fileInfo.modified) }]}
            />
            <List.Item
              icon={{ source: Icon.Lock, tintColor: Color.Red }}
              title="Permissions"
              accessories={[{ text: fileInfo.permissions }]}
            />
          </List.Section>
        </>
      )}
    </List>
  );
}
