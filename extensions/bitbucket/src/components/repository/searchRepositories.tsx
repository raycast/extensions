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
import { useState, useEffect, useRef } from "react";

import { getRepositories } from "../../queries";
import { Repository } from "./interface";
import { icon } from "../../helpers/icon"

interface State {
  repositories?: Repository[];
  error?: Error;
}

export function SearchRepositories(): JSX.Element {
  const [state, setState] = useState<State>({});

  useEffect(() => {
    async function fetchRepositories() {
      try {
        const { data } = await getRepositories()

        const repositories = data.values
          .map((repo: any) => ({
            name: repo.name as string,
            uuid: repo.uuid as string,
            slug: repo.slug as string,
            fullName: repo.full_name as string,
            avatarUrl: repo.links.avatar.href as string,
            description: repo.description as string || '',
            url: `https://bitbucket.org/${repo.full_name}`
          }));

        setState({ repositories: repositories });
      } catch (error) {
        setState({ error: error instanceof Error ? error : new Error("Something went wrong") });
      }
    }

    fetchRepositories();
  }, []);

  if (state.error) {
    showToast(ToastStyle.Failure, "Failed loading repositories", state.error.message);
  }

  return (
    <List isLoading={!state.repositories && !state.error} searchBarPlaceholder="Search by name...">
      <List.Section title="Repositories" subtitle={state.repositories?.length + ""}>
        {state.repositories?.map((repo) => (
          <SearchListItem key={repo.uuid} repo={repo} />
        ))}
      </List.Section>
    </List>
  );
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