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
  getPreferenceValues,
} from "@raycast/api";
import { useFiles } from "./lib/hooks";
import { filesize } from "filesize";
import { useState } from "react";
import { UTApi } from "uploadthing/server";
import { StatusIconMap, getToken } from "./lib/utils";

const utapi = new UTApi({ token: getToken() });

const getUrl = async (key: string) => {
  const { url } = await utapi.getSignedURL(key);
  return url;
};

const deleteFile = async (key: string) => {
  await utapi.deleteFiles(key);
};

export default () => {
  const { isLoading, files, pagination, revalidate } = useFiles();
  const [filter, setFilter] = useState("");
  const { defaultAction } = getPreferenceValues<Preferences.ListFiles>();

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
                {defaultAction === "open" ? (
                  <>
                    <OpenInBrowserAction name={file.name} fileKey={file.key} />
                    <CopyToClipboardAction
                      name={file.name}
                      fileKey={file.key}
                    />
                  </>
                ) : (
                  <>
                    <CopyToClipboardAction
                      name={file.name}
                      fileKey={file.key}
                    />
                    <OpenInBrowserAction name={file.name} fileKey={file.key} />
                  </>
                )}
                <ActionPanel.Section>
                  <Action
                    icon={Icon.Trash}
                    title="Delete File"
                    style={Action.Style.Destructive}
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
                        revalidate();
                        await toast.hide();
                        showToast(
                          Toast.Style.Success,
                          "File Deleted",
                          file.name,
                        );
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

function CopyToClipboardAction({
  name,
  fileKey,
}: {
  name: string;
  fileKey: string;
}) {
  return (
    <Action
      icon={Icon.Paperclip}
      title="Copy URL to Clipboard"
      onAction={async () => {
        const toast = await showToast(
          Toast.Style.Animated,
          "Getting URL",
          name,
        );
        const url = await getUrl(fileKey);
        await toast.hide();
        await Clipboard.copy(url);
      }}
    />
  );
}

function OpenInBrowserAction({
  name,
  fileKey,
}: {
  name: string;
  fileKey: string;
}) {
  return (
    <Action
      icon={Icon.Globe}
      title="Open in Browser"
      onAction={async () => {
        const toast = await showToast(
          Toast.Style.Animated,
          "Getting URL",
          name,
        );
        const url = await getUrl(fileKey);
        await toast.hide();
        await open(url);
      }}
    />
  );
}
