import { ActionPanel, List, showToast, Color, Toast, Action, Image } from "@raycast/api";
import { useState, useEffect } from "react";

import { Repository } from "../types";
import { PullRequest } from "../types";
import { pullRequestsGetQuery } from "./../../queries";
import { preferences } from "../../helpers/preferences";

interface State {
  pullRequests?: PullRequest[];
  error?: Error;
}

export function PullRequestsList(props: { repo: Repository; pageNumber: number }): JSX.Element {
  const [state, setState] = useState<State>({});

  useEffect(() => {
    async function fetchPRs() {
      try {
        const data = await pullRequestsGetQuery(props.repo);

        const prs = data.map((pr: any) => ({
          id: pr.id as number,
          title: pr.title as string,
          description: pr.description as string,
          repo: {
            name: pr.fromRef.repository.name as string,
          },
          commentCount: (pr.properties.commentCount || 0) as number,
          author: {
            url: `${preferences.baseURL}${pr.author.user.avatarUrl}` as string,
            nickname: pr.author.user.name as string,
          },
          repositoryUrl: props.repo.url,
        }));
        setState({ pullRequests: prs });
      } catch (error) {
        setState({ error: error instanceof Error ? error : new Error("Something went wrong") });
      }
    }

    fetchPRs();
  }, []);

  if (state.error) {
    showToast(Toast.Style.Failure, "Failed loading repositories", state.error.message);
  }

  return (
    <List isLoading={!state.pullRequests && !state.error} searchBarPlaceholder="Search by name...">
      <List.Section title="Open Pull Requests" subtitle={state.pullRequests?.length + ""}>
        {state.pullRequests?.map((pr) => (
          <List.Item
            key={pr.id}
            title={pr.title}
            subtitle={pr.description}
            accessories={[
              { text: `${pr.commentCount} 💬  ·  Created by ${pr.author.nickname}` },
              { icon: { source: pr.author.url, mask: Image.Mask.Circle } },
            ]}
            icon={{ source: "icon-pr.png", tintColor: Color.PrimaryText }}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.OpenInBrowser
                    title="Open Pull Request in Browser"
                    url={`${pr.repositoryUrl}/pull-requests/${pr.id}`}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
