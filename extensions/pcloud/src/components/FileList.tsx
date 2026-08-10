import { Action, ActionPanel, List, openExtensionPreferences, Icon } from "@raycast/api";
import React from "react";
import { useSearchProvider } from "../providers/SearchProvider";
import { getIconForFile } from "../utils/utils";
import { IFile } from "../types/file";
import { useConfigProvider } from "../providers/ConfigProvider";

type FileListProps = {
  isLoading: boolean;
};
export function FileList(props: FileListProps) {
  const { isLoading } = props;
  const { files, isLoading: isSearching, search, pagination, totalItems } = useSearchProvider();
  const {
    config: { pCloudDriveDirectory, excludedFilePatterns },
  } = useConfigProvider();
  return (
    <List
      isLoading={isLoading || isSearching || files === undefined}
      searchBarPlaceholder="Search files"
      throttle={true}
      onSearchTextChange={search}
      pagination={pagination}
    >
      <List.Section title="Results" subtitle={`${totalItems} results`}>
        {(files || [])
          .filter((f) => !(excludedFilePatterns || []).some((p) => f.path.match(p)))
          .map((file) => (
            <FileListItem key={file.id} file={file} pcloudBasePath={pCloudDriveDirectory} />
          ))}
      </List.Section>
    </List>
  );
}

function FileListItem(props: { file: IFile; pcloudBasePath: string }) {
  const { file } = props;
  return (
    <List.Item
      key={file.id}
      icon={getIconForFile(file.title.value, file.context.isfolder)}
      title={file.title}
      accessories={file.accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Open title={"Open"} target={file.path} />
            <Action.Open
              title={"Open Containing Folder"}
              target={file.path.replace(file.path.substring(file.path.lastIndexOf("/")), "")}
            />
            <Action.CopyToClipboard title={"Copy Path to Clipboard"} content={file.path} />
            <Action title={"Open Extension Preferences"} onAction={openExtensionPreferences} icon={Icon.Gear} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
