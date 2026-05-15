import { Action, ActionPanel, Icon, List, getPreferenceValues } from "@raycast/api";
import { useOrganizations } from "./hooks/useOrganizations";

type Preferences = {
  serverUrl: string;
};

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const { items, isLoading, pagination } = useOrganizations();

  const baseUrl = preferences.serverUrl.replace(/\/+$/, "");

  return (
    <List searchBarPlaceholder="Search organizations" isLoading={isLoading} pagination={pagination}>
      {items.length === 0 ? (
        <List.EmptyView icon={Icon.Building} title="No organizations found" />
      ) : (
        items.map((org) => {
          const accessories: List.Item.Accessory[] = [];
          if (org.visibility === "private") {
            accessories.push({ icon: Icon.Lock, text: "Private" });
          }
          return (
            <List.Item
              key={org.id || org.name || "org"}
              title={org.full_name || org.name || ""}
              subtitle={org.description}
              icon={org.avatar_url ? { source: org.avatar_url } : Icon.Building}
              accessories={accessories}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser title="Open Organization" url={`${baseUrl}/${org.name}`} />
                  <ActionPanel.Section title="Copy">
                    <Action.CopyToClipboard title="Copy Organization URL" content={`${baseUrl}/${org.name}`} />
                    <Action.CopyToClipboard title="Copy Organization Name" content={org.name ?? ""} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
