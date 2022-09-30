import { ActionPanel, Action, List, Icon, getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";

export default function Command() {
  const pref = getPreferenceValues<Preferences>();

  const { isLoading, data } = useFetch<SearchState>(
    `https://api.ossinsight.io/q/trending-repos?language=${pref.language}&period=${pref.period}`
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search trending repositories...">
      {data?.data.map((searchResult, index) => (
        <SearchListItem key={searchResult.repo_id} searchResult={searchResult} index={index} />
      ))}
    </List>
  );
}

function SearchListItem({ searchResult, index }: { searchResult: Repository; index: number }) {
  return (
    <List.Item
      title={`#${index + 1} ${searchResult.repo_name}`}
      subtitle={searchResult.description ?? ""}
      accessories={[
        searchResult.language
          ? {
              icon: Icon.Code,
              text: searchResult.language,
              tooltip: "Language",
            }
          : {},
        {
          icon: Icon.Star,
          text: searchResult.stars + "",
          tooltip: "Stars",
        },
        {
          icon: Icon.Shuffle,
          text: searchResult.forks + "",
          tooltip: "Forks",
        },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Analyze" url={`https://ossinsight.io/analyze/${searchResult.repo_name}`} />
            <Action.OpenInBrowser title="Visit Repository" url={`https://github.com/${searchResult.repo_name}`} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Command">
            <Action.CopyToClipboard
              title="Copy SSH Clone Command"
              content={`git clone git@github.com:${searchResult.repo_name}.git`}
            />
            <Action.CopyToClipboard
              title="Copy HTTP Clone Command"
              content={`git clone https://github.com/${searchResult.repo_name}.git`}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

interface Preferences {
  language: string;
  period: string;
}

interface SearchState {
  data: Repository[];
}

export interface Repository {
  collection_names: any;
  contributor_logins: string;
  description: string | null;
  forks: number;
  language: string | null;
  pull_requests: number;
  pushes: any;
  repo_id: number;
  repo_name: string;
  stars: number;
  total_score: number;
}
