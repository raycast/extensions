import {
  ActionPanel,
  CopyToClipboardAction,
  List,
  OpenInBrowserAction,
  showToast,
  ToastStyle,
  randomId,
  PushAction,
  Detail,
  ImageMask,
  FormTextField,
  Icon,
  ListItem,
  Color
} from "@raycast/api";
import {
  ShowPipelinesActions
} from "./actions";
import { useState, useEffect, useRef } from "react";

import { repositoryGetQuery } from "./queries";
import { Repository } from "./interface";
import { Json } from "../../helpers/types"

interface State {
  repositories?: Repository[];
  error?: Error;
}

export function SearchRepositories(): JSX.Element {
  const [state, setState] = useState<State>({});

  useEffect(() => {
    async function fetchRepositories() {
      try {
        const repositories = await getRepositories();
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

// TODO seet number of repos in preferences
function SearchListItem({ repo }: { repo: Repository }): JSX.Element {
  // console.log(repo.avatarUrl)
  return (
    <List.Item
      title={repo.name}
      subtitle={repo.description}
      // subtitle={searchResult.tags.join(" - ")}
      // accessoryTitle={searchResult.isStarred ? "⭐" : ""}
      // accessoryTitle={repo.name}
      icon={{ source: repo.avatarUrl, mask: ImageMask.RoundedRectangle }}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Browser actions">
            <OpenInBrowserAction
              title="Open Repository in Browser"
              url={repo.url}
              icon={{ source: "icon-code.png", tintColor: Color.PrimaryText }}
            />
            <OpenInBrowserAction
              title="Open Pipelines in Browser"
              url={repo.url + '/addon/pipelines/home'}
              icon={{ source: "icon-pipelines.png", tintColor: Color.PrimaryText }}
            />
            <OpenInBrowserAction
              title="Open PRs in Browser"
              url={repo.url + '/pull-requests'}
              icon={{ source: "icon-pr.png", tintColor: Color.PrimaryText }}
              shortcut={{ modifiers: ["cmd"], key: "." }}
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

async function getRepositories(): Promise<Repository[]> {
  const response = await repositoryGetQuery()

  if (!response.ok) {
    return Promise.reject(response.statusText);
  }

  const repos = (await response.json()).values as Json[];

  return repos
    .map((repo: any) => {
      // if (repo.name == "Advertising") console.log(repo)

      return {
        name: repo.name as string,
        uuid: repo.uuid as string,
        slug: repo.slug as string,
        fullName: repo.full_name as string,
        avatarUrl: repo.links.avatar.href as string,
        description: repo.description as string || '',
        url: `https://bitbucket.org/${repo.full_name}`
      };
    });
}