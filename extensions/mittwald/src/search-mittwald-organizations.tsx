import { ActionPanel, Action, Icon, List, getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";

interface Preferences {
  token: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();

  const { isLoading, data: organizations } = useFetch<{ name: string; customerId: string }[]>(
    "https://api.mittwald.de/v2/customers",
    {
      method: "get",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${preferences.token}`,
      },
      keepPreviousData: true,
    },
  );

  return (
    <List isLoading={!organizations && isLoading}>
      {organizations?.map((organizations) => (
        <List.Item
          key={organizations.customerId}
          icon={Icon.Building}
          title={organizations.name}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                url={`https://studio.mittwald.de/app/organizations/${organizations.customerId}/dashboard`}
              ></Action.OpenInBrowser>
              <Action.CopyToClipboard
                content={`https://studio.mittwald.de/app/organizations/${organizations.customerId}/dashboard`}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
