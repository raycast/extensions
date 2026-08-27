import { ActionPanel, List, showToast, Color, Action, Image, Toast } from "@raycast/api";
import { useState, useEffect } from "react";

import { getAllOpenPullRequests } from "./../../queries";
import { PullRequest } from "./interface";

interface State {
  pullRequests?: PullRequest[];
  error?: Error;
}

export function SearchAllPullRequests() {
  const [state, setState] = useState<State>({});

  useEffect(() => {
    async function fetchPRs() {
      try {
        const { values: pullRequests, failedRepoCount } = await getAllOpenPullRequests();

        const prs =
          pullRequests.map((pr) => ({
            id: pr.id,
            title: pr.title,
            repo: {
              name: pr.destination?.repository?.name,
              fullName: pr.destination?.repository?.full_name,
            },
            commentCount: pr.comment_count,
            author: {
              url: pr.author?.links?.avatar?.href,
              nickname: pr.author?.nickname,
            },
          })) ?? [];
        setState({ pullRequests: prs });

        if (failedRepoCount > 0) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Some repositories failed to load",
            message: `Could not fetch pull requests from ${failedRepoCount} ${
              failedRepoCount === 1 ? "repository" : "repositories"
            }. Results may be incomplete.`,
          });
        }
      } catch (error) {
        setState({ error: error instanceof Error ? error : new Error("Something went wrong") });
      }
    }

    fetchPRs();
  }, []);

  if (state.error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed loading pull requests",
      message: state.error.message,
    });
  }

  return (
    <List isLoading={!state.pullRequests && !state.error} searchBarPlaceholder="Search by name...">
      <List.Section title="Open Pull Requests" subtitle={state.pullRequests?.length + ""}>
        {state.pullRequests?.map((pr) => (
          <List.Item
            key={`${pr.repo.fullName}-${pr.id}`}
            title={pr.title}
            subtitle={pr.repo?.fullName}
            icon={{ source: "icon-pr.png", tintColor: Color.PrimaryText }}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.OpenInBrowser
                    title="Open Pull Request in Browser"
                    url={`https://bitbucket.org/${pr.repo.fullName}/pull-requests/${pr.id}`}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
            accessories={[
              {
                text: `${pr.commentCount} 💬  ·  Created by ${pr.author.nickname}`,
                icon: { source: pr.author.url, mask: Image.Mask.Circle },
              },
            ]}
          />
        ))}
      </List.Section>
    </List>
  );
}
