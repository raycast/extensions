import { ActionPanel, Action, getPreferenceValues, List, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import type { Preferences, Platform } from "./types";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const { data, isLoading } = useFetch<Platform[]>(`https://libraries.io/api/platforms?api_key=${preferences.token}`, {
    onError: (error) => {
      showToast(
        Toast.Style.Failure,
        "Error",
        error.message === "Forbidden" ? "Check credentials and try again" : error.message
      );
    },
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter platforms..." enableFiltering throttle>
      <List.EmptyView icon="no-view.png" description="No Results" />
      <List.Section title="Results" subtitle={data?.length + ""}>
        {data?.map((searchResult) => (
          <SearchListItem key={searchResult.name} searchResult={searchResult} />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: Platform }) {
  return (
    <List.Item
      title={searchResult.name}
      icon={`package_manager_icons/${searchResult.name.toLowerCase()}.png`}
      subtitle={searchResult.defaultLanguage}
      accessoryTitle={`${searchResult.project_count.toLocaleString()} packages available`}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              title="Open Libraries.io Page"
              url={`https://libraries.io/${searchResult.name}`}
              icon={`libraries-io-icon.png`}
            />
            <Action.OpenInBrowser title="Open in Browser" url={searchResult.homepage} />
            <Action.CopyToClipboard
              content={searchResult.name}
              shortcut={{ modifiers: ["cmd"], key: "." }}
              title="Copy Platform Name"
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
