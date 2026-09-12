import { Action, ActionPanel, Color, Icon, Image, List, showToast, Toast } from "@raycast/api";
import useSWR, { SWRConfig } from "swr";
import { ShowPullRequestsActions } from "./components/repository/actions";
import { Repository } from "./components/types";
import { cacheConfig, REPOSITORIES_CACHE_KEY } from "./helpers/cache";
import { icon } from "./helpers/icon";
import { getRepositories } from "./queries";

export default function SearchMyRepositories() {
  return (
    <SWRConfig value={cacheConfig}>
      <SearchList />
    </SWRConfig>
  );
}

function SearchList(): JSX.Element {
  const { data, error, isValidating } = useSWR(REPOSITORIES_CACHE_KEY, getRepositories);

  if (error) {
    showToast(Toast.Style.Failure, "Failed loading repositories", error.message);
  }

  return (
    <List isLoading={isValidating} searchBarPlaceholder="Search by name...">
      <List.Section title="Repositories" subtitle={data?.length.toString()}>
        {data?.map(toRepository).map((repo: Repository) => (
          <SearchListItem key={repo.id} repo={repo} />
        ))}
      </List.Section>
    </List>
  );
}

const toRepository = (repo: any): Repository => {
  return {
    id: repo.id as string,
    name: repo.name as string,
    slug: repo.slug as string,
    avatarUrl: `${repo.project?.links?.self[0]?.href}/avatar.png?s=32` as string, // is svg
    description: (repo.description as string) || "",
    url: (`${repo.links?.self[0]?.href}` || "").replace("/browse", ""),
    project: repo.project,
  };
};

const SearchListItem = ({ repo }: { repo: Repository }): JSX.Element => {
  return (
    <List.Item
      title={repo.name}
      subtitle={repo.description}
      icon={{ source: Icon.Code, mask: Image.Mask.RoundedRectangle }}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Browser actions">
            <Action.OpenInBrowser
              title="Open Repository in Browser"
              url={repo.url}
              icon={{ source: icon.code, tintColor: Color.PrimaryText }}
            />
            <Action.OpenInBrowser
              title="Open Branches in Browser"
              url={repo.url + "/branches"}
              icon={{ source: icon.branch, tintColor: Color.PrimaryText }}
            />
            <Action.OpenInBrowser
              title="Open Pull Requests in Browser"
              url={repo.url + "/pull-requests"}
              icon={{ source: icon.pr, tintColor: Color.PrimaryText }}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Details">
            <ShowPullRequestsActions repo={repo} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};
