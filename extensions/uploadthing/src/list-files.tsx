import { ActionPanel, Action, List, Icon, Color, showToast, Toast, open } from "@raycast/api";
import { useFiles } from "./lib/hooks";
import { filesize } from "filesize";
import { useState } from "react";
import { UTApi } from "uploadthing/server";
import { getStatusIcon, getToken } from "./lib/utils";

export default () => {
  const { isLoading, files } = useFiles();
  const [filter, setFilter] = useState("");

  return <List isLoading={isLoading} searchBarAccessory={<List.Dropdown tooltip="Filter" onChange={setFilter}>
    <List.Dropdown.Item icon={Icon.Document} title="All" value="" />
    <List.Dropdown.Section title="Status">
      <List.Dropdown.Item icon={getStatusIcon("Deletion Pending")} title="Deletion Pending" value="status_Deletion Pending" />
      <List.Dropdown.Item icon={getStatusIcon("Failed")} title="Failed" value="status_Failed" />
      <List.Dropdown.Item icon={getStatusIcon("Uploaded")} title="Uploaded" value="status_Uploaded" />
      <List.Dropdown.Item icon={getStatusIcon("Uploading")} title="Uploading" value="status_Uploading" />
    </List.Dropdown.Section>
  </List.Dropdown>}>
      {!isLoading && !files.length && <List.EmptyView title="No files uploaded yet" description="Upload some files to get started!" />}
        {files.filter(file => {
          if (!filter) return true;
          const status = filter.split("status_")[1];
          return file.status===status;
        }).map((file) => (
          <List.Item
            key={file.key}
            icon={getStatusIcon(file.status)}
            title={file.name}
            subtitle={file.status}
            accessories={[
              { text: filesize(file.size, { standard: "jedec" }) },
              { date: new Date(file.uploadedAt) }
            ]}
            actions={
              <ActionPanel>
                <Action icon={Icon.Globe} title="Open in Browser" onAction={async () => {
                  const toast = await showToast(Toast.Style.Animated, "Getting URL", file.name);
                  const utapi = new UTApi({ token: getToken() });
                  const {url} = await utapi.getSignedURL(file.key);
                  await toast.hide();
                  await open(url);
                }} />
              </ActionPanel>
            }
          />
        ))}
      </List>
};