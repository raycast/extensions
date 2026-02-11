import { ActionPanel, Action, Icon, List, showToast, Toast, LaunchProps } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { getAppLinks } from "./api";

export default function Command(props: LaunchProps) {
  const { isLoading, data: apps, error } = usePromise(getAppLinks);
  const [searchText, setSearchText] = useState(props.fallbackText ?? "");

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to load apps",
      message: error.message,
    });
  }

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="List Okta apps..."
    >
      {apps?.map((app) => (
        <List.Item
          key={app.id}
          icon={app.logoUrl || Icon.AppWindow}
          title={app.label}
          subtitle={app.appName}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={app.linkUrl} />
              <Action.CopyToClipboard content={app.linkUrl} title="Copy Link" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
