import {
  ActionPanel,
  List,
  OpenInBrowserAction,
  showToast,
  ToastStyle,
  ImageMask,
  Color
} from "@raycast/api";
import {
  ShowPipelinesActions,
} from "./actions";

import {getRepositories, useRepositories} from "../../queries";
import { Repository } from "./interface";
import { icon } from "../../helpers/icon"
import { cacheConfig } from "../../helpers/cache";
import useSWR, {mutate, SWRConfig} from "swr";

const REPOSITORIES_CACHE_KEY = "repositories4";

export function SearchRepositories() {
    return (
        <SWRConfig value={cacheConfig}>
            <SearchList />
        </SWRConfig>
    );
}

function SearchList(): JSX.Element {
    const { data, error, isValidating } = useRepositories();

    if (error) {
        showToast(ToastStyle.Failure, "Failed loading repositories", error.message);
    }

    if (!isValidating) {
        setTimeout(() => {
            // mutate(REPOSITORIES_CACHE_KEY, getRepositories)
        }, 1000)
    }

    return (
        <List isLoading={isValidating} searchBarPlaceholder="Search by name..." actions={SearchListActions()}>
            <List.Section title="Repositories" subtitle={data?.length.toString()}>
                {data?.map(toRepository).map((repo: any) => (
                    <SearchListItem key={repo.uuid} repo={repo} />
                ))}
            </List.Section>
        </List>
    );
}

function SearchListActions(): JSX.Element {
    return (
        <ActionPanel title="Search Repositories2">
            <ActionPanel.Item
                title="Reload repositories"
                onAction={() => mutate(REPOSITORIES_CACHE_KEY)}
            />
        </ActionPanel>
    )
}

function toRepository(repo: any): Repository {
    return {
        name: repo.name as string,
        uuid: repo.uuid as string,
        slug: repo.slug as string,
        fullName: repo.full_name as string,
        avatarUrl: repo.links.avatar.href as string,
        description: repo.description as string || '',
        url: `https://bitbucket.org/${repo.full_name}`
    }
}

function SearchListItem({ repo }: { repo: Repository }): JSX.Element {
  return (
    <List.Item
      title={repo.name}
      subtitle={repo.description}
      icon={{ source: repo.avatarUrl, mask: ImageMask.RoundedRectangle }}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Browser actions">
            <OpenInBrowserAction
              title="Open Repository in Browser"
              url={repo.url}
              icon={{ source: icon.code, tintColor: Color.PrimaryText }}
            />
            <OpenInBrowserAction
              title="Open Branches in Browser"
              url={repo.url + '/branches'}
              icon={{ source: icon.branch, tintColor: Color.PrimaryText }}
            />
            <OpenInBrowserAction
              title="Open Pull Requests in Browser"
              url={repo.url + '/pull-requests'}
              icon={{ source: icon.pr, tintColor: Color.PrimaryText }}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
            <OpenInBrowserAction
              title="Open Pipelines in Browser"
              url={repo.url + '/addon/pipelines/home'}
              icon={{ source: icon.pipeline.self, tintColor: Color.PrimaryText }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Details">
            <ShowPipelinesActions repo={repo} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
