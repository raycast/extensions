import { ActionPanel, List, OpenInBrowserAction, showToast, ToastStyle, ImageMask, Color } from "@raycast/api";
import { useState, useEffect } from "react";

import { Repository, Pipeline } from "./interface";
import { PullRequest } from "../pullRequests/interface";
import { icon } from "../../helpers/icon";
import { pullRequestsGetQuery } from "./../../queries";

interface State {
  pullRequests?: PullRequest[];
  error?: Error;
}

export function PullRequestsList(props: { repo: Repository; pageNumber: number }): JSX.Element {
  const [state, setState] = useState<State>({});
  const [pageNumber, setPageNumber] = useState<number>(1);

  useEffect(() => {
    async function fetchPRs() {
      try {
        const { data } = await pullRequestsGetQuery(props.repo.slug, pageNumber);

        const prs = data.values.map((pr: any) => ({
          id: pr.id as number,
          title: pr.title as string,
          repo: {
            name: pr.destination.repository.name as string,
            fullName: pr.destination.repository.full_name as string,
          },
          commentCount: pr.comment_count as number,
          author: {
            url: pr.author.links.avatar.href as string,
            nickname: pr.author.nickname as string,
          },
        }));
        setState({ pullRequests: prs });
      } catch (error) {
        setState({ error: error instanceof Error ? error : new Error("Something went wrong") });
      }
    }

    fetchPRs();
  }, []);

  if (state.error) {
    showToast(ToastStyle.Failure, "Failed loading repositories", state.error.message);
  }

  return (
    <List isLoading={!state.pullRequests && !state.error} searchBarPlaceholder="Search by name...">
      <List.Section title="Open Pull Requests" subtitle={state.pullRequests?.length + ""}>
        {state.pullRequests?.map((pr) => (
          <List.Item
            key={pr.id}
            title={pr.title}
            subtitle={pr.repo?.fullName}
            accessoryTitle={`${pr.commentCount} 💬  ·  Created by ${pr.author.nickname}`}
            accessoryIcon={{ source: pr.author.url, mask: ImageMask.Circle }}
            icon={{ source: "icon-pr.png", tintColor: Color.PrimaryText }}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <OpenInBrowserAction
                    title="Open Pull Request in Browser"
                    url={`https://bitbucket.org/${pr.repo.fullName}/pull-requests/${pr.id}`}
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
