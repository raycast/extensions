import { Action, ActionPanel, getPreferenceValues, Icon, List } from "@raycast/api";
import { useOrganizations } from "./api";

export default function Command() {
  const preferences = getPreferenceValues();
  const url = preferences.url;

  const { data, isLoading } = useOrganizations();

  return (
    <List searchBarPlaceholder="Search for organizations" isLoading={isLoading}>
      {data &&
        data.map((item) => (
          <List.Item
            key={item.id}
            title={item.full_name}
            subtitle={item.description}
            accessories={[
              { icon: { source: item.avatar_url } },
              { icon: item.visibility === "public" ? undefined : Icon.Lock, text: item.visibility },
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={`${url}/${item.name}`} />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
