import {
  ActionPanel,
  Action,
  List,
  Icon,
  showToast,
  Toast,
  open,
  Clipboard,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useFiles } from "./lib/hooks";
import { filesize } from "filesize";
import { useState } from "react";
import { UTApi } from "uploadthing/server";
import { StatusIconMap, getToken } from "./lib/utils";

export default () => {
  const { isLoading, files, pagination } = useFiles();
  const [filter, setFilter] = useState("");
  const utapi = new UTApi({ token: getToken() });

  const deleteFile = async (fileKey: string) => {
    await utapi.deleteFiles(fileKey);
  };

  const getURL = async (file: ReturnType<typeof useFiles>["files"][number]) => {
    const { url } = await utapi.getSignedURL(file.key);
    return url;
  };

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" onChange={setFilter}>
          <List.Dropdown.Item icon={Icon.Document} title="All" value="" />
          <List.Dropdown.Section title="Status">
            {Object.entries(StatusIconMap).map(([status, icon]) => (
              <List.Dropdown.Item
                key={status}
                icon={icon}
                title={status}
                value={`status_${status}`}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {!isLoading && !files.length && (
        <List.EmptyView
          title="No files uploaded yet"
          description="Upload some files to get started!"
        />
      )}
      {files
        .filter((file) => {
          if (!filter) return true;
          const status = filter.split("status_")[1];
          return file.status === status;
        })
        .map((file) => (
          <List.Item
            key={file.key}
            icon={StatusIconMap[file.status]}
            title={file.name}
            subtitle={file.status}
            accessories={[
              { text: filesize(file.size, { standard: "jedec" }) },
              { date: new Date(file.uploadedAt) },
            ]}
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.Globe}
                  title="Open in Browser"
                  onAction={async () => {
                    const fileUrl = await getURL(file);
                    const toast = await showToast(
                      Toast.Style.Animated,
                      "Getting URL",
                      file.name,
                    );
                    await open(fileUrl);
                    await toast.hide();
                  }}
                />
                <Action
                  icon={Icon.Paperclip}
                  title="Copy URL to Clipboard"
                  onAction={async () => {
                    const toast = await showToast(
                      Toast.Style.Animated,
                      "Getting URL",
                      file.name,
                    );
                    const fileUrl = await getURL(file);
                    await Clipboard.copy(fileUrl);
                    await toast.hide();
                  }}
                />
                <ActionPanel.Section>
                  <Action
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    title="Delete File"
                    onAction={async () => {
                      if (
                        await confirmAlert({
                          title: "Are you sure you want to delete this file?",
                          message: file.name,
                          primaryAction: {
                            title: "Delete",
                            style: Alert.ActionStyle.Destructive,
                          },
                        })
                      ) {
                        const toast = await showToast(
                          Toast.Style.Animated,
                          "Deleting File",
                          file.name,
                        );
                        await deleteFile(file.key);
                        await toast.hide();
                      } else {
                        return;
                      }
                    }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
};
