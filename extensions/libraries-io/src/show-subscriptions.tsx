import { ActionPanel, Action, Icon, getPreferenceValues, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import type { Package, Subscription } from "./types";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const { data, isLoading } = useFetch<Subscription[]>(
    `https://libraries.io/api/subscriptions?api_key=${preferences.token}`
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter subscriptions..." enableFiltering throttle>
      <List.Section title="Results" subtitle={data?.length + ""}>
        {data?.map((searchResult) => (
          <SearchListItem key={searchResult.project.name} searchResult={searchResult.project} />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: Package }) {
  return (
    <List.Item
      title={searchResult.name}
      icon={Icon.Bookmark}
      subtitle={searchResult.description}
      accessories={[{ text: searchResult.platform }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              title="Open Libraries.io Page"
              url={`https://libraries.io/${searchResult.platform.toLowerCase()}/${encodeURIComponent(
                searchResult.name
              )}`}
              icon={`libraries-io-icon.png`}
            />
            <Action.OpenInBrowser title="Open Homepage" url={searchResult.homepage} icon={Icon.House} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

interface Preferences {
  token: string;
}
