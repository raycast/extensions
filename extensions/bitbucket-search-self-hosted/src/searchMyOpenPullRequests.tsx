import { ActionPanel, List, Action, showToast, Color, Toast, Image } from "@raycast/api";
import { useState, useEffect } from "react";
import { PullRequest } from "./components/types";
import { preferences } from "./helpers/preferences";
import { getMyOpenPullRequests } from "./queries";

interface State {
  pullRequests?: PullRequest[];
  error?: Error;
}

const toPullRequest = (pr: any): PullRequest => {
  return {
    id: pr.id as number,
    title: pr.title as string,
    description: pr.description as string,
    repo: {
      name: pr.fromRef.repository.name as string,
    },
    commentCount: (pr.properties.commentCount || 0) as number,
    author: {
      url: `${preferences.baseURL}/users/${pr.author.user.name}/avatar.png` as string,
      nickname: pr.author.user.name as string,
    },
    url: pr.links?.self[0]?.href,
  };
};

export default function SearchPullRequests() {
  const [state, setState] = useState<State>({});

  useEffect(() => {
    const fetchPRs = async () => {
      try {
        const data = await getMyOpenPullRequests();
        const prs = data.map(toPullRequest);
        setState({ pullRequests: prs });
      } catch (error) {
        setState({ error: error instanceof Error ? error : new Error("Something went wrong") });
      }
    };

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
                  <Action.OpenInBrowser title="Open Pull Request in Browser" url={`${pr.url}`} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
