import { Icon, List, ActionPanel } from "@raycast/api";
import React from "react";
import { getUserProfile } from "./hooks/hooks";
import { ListEmptyView } from "./components/list-empty-view";
import { titleCase } from "./utils/common-utils";
import { ActionOpenExtensionPreferences } from "./components/action-open-extension-preferences";
import { ActionToSmMs } from "./components/action-to-sm-ms";

export default function GetUserProfile() {
  const { userData, loading } = getUserProfile();

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder={"Search profiles"}
      throttle={true}
      actions={
        <ActionPanel>
          <ActionToSmMs />
          <ActionOpenExtensionPreferences />
        </ActionPanel>
      }
    >
      <ListEmptyView icon={Icon.Text} title={"No profiles"} />
      {!loading && typeof userData.username !== "undefined" && (
        <>
          <List.Item
            icon={Icon.Terminal}
            title={"Username"}
            subtitle={userData.username}
            actions={
              <ActionPanel>
                <ActionToSmMs />
                <ActionOpenExtensionPreferences />
              </ActionPanel>
            }
          />
          <List.Item
            icon={Icon.Envelope}
            title={"Email"}
            subtitle={userData.email}
            actions={
              <ActionPanel>
                <ActionToSmMs />
                <ActionOpenExtensionPreferences />
              </ActionPanel>
            }
          />
          <List.Item
            icon={Icon.Person}
            title={"Role"}
            subtitle={titleCase(userData.role)}
            actions={
              <ActionPanel>
                <ActionToSmMs />
                <ActionOpenExtensionPreferences />
              </ActionPanel>
            }
          />
          <List.Item
            icon={Icon.MemoryChip}
            title={"Disk Usage"}
            subtitle={userData.disk_usage + " / " + userData.disk_limit}
            actions={
              <ActionPanel>
                <ActionToSmMs />
                <ActionOpenExtensionPreferences />
              </ActionPanel>
            }
          />
        </>
      )}
    </List>
  );
}
