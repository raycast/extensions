import { Action, ActionPanel, Color, getPreferenceValues, Image, List, showToast, Toast } from "@raycast/api";
import { Octokit } from "octokit";
import { useEffect, useState } from "react";
import { getGitHubAPI, Issue, IssueState, Repo, User } from "../github";
import { getErrorMessage } from "../utils";

export interface IssueSearchParams {
  query: string | undefined;
  assignedTo: string | undefined;
  state: IssueState | undefined;
}

function getIconByState(issue: Issue): Image.ImageLike {
  return { source: "exclamation.png", tintColor: issue.state === "open" ? Color.Green : Color.Red };
}

function getTooltipByState(issue: Issue): string {
  return issue.state === "open" ? "Open" : "Closed";
}

function Issue(props: { issue: Issue }): JSX.Element {
  const i = props.issue;
  return (
    <List.Item
      key={i.id.toString()}
      title={i.title}
      subtitle={`#${i.number}`}
      icon={{ value: getIconByState(i), tooltip: getTooltipByState(i) }}
      accessories={[
        { date: new Date(i.updated_at) },
        { icon: { source: i.user?.avatar_url, mask: Image.Mask.Circle }, tooltip: i.user.login },
      ]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={i.html_url} />
        </ActionPanel>
      }
    />
  );
}

export function MyAssingedIssues(): JSX.Element {
  const [searchtext, setSearchtext] = useState("");
  const { issues, error, isLoading } = useIssues({ query: searchtext, assignedTo: "@me", state: IssueState.open });
  if (error) {
    showToast({ style: Toast.Style.Failure, message: error, title: "Could not fetch Issues" });
  }
  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchtext} throttle>
      <List.Section title="Your Assigned Issues" subtitle={`${issues?.length}`}>
        {issues?.map((i) => (
          <Issue key={i.id} issue={i} />
        ))}
      </List.Section>
    </List>
  );
}

function useIssues(params: IssueSearchParams): {
  issues: Issue[] | undefined;
  error?: string;
  isLoading: boolean | undefined;
} {
  const [issues, setIssues] = useState<Issue[]>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    async function fetchData() {
      setIsLoading(true);
      setError(undefined);
      try {
        const octokit = getGitHubAPI();
        const searchParts = ["type:issue", "sort:updated"];
        if (params.assignedTo) {
          searchParts.push(`assignee:${params.assignedTo}`);
        }
        if (params.state) {
          searchParts.push(`is:${params.state}`);
        }
        if (params.query) {
          searchParts.push(params.query);
        }
        const q = searchParts.join(" ");
        const d = await octokit.rest.search.issuesAndPullRequests({
          q: q, //`type:issue assignee:@me is:open sort:updated ${query}`, // author:@me
        });
        const data: Issue[] | undefined = d.data?.items?.map((p) => ({
          id: p.id,
          number: p.number,
          title: p.title,
          url: p.url,
          html_url: p.html_url,
          body_text: p.body_text,
          repository: p.repository as Repo | undefined,
          user: p.user as User | undefined,
          created_at: p.created_at,
          updated_at: p.updated_at,
          state: p.state,
        }));
        if (!cancel) {
          setIssues(data);
        }
      } catch (error) {
        setError(getErrorMessage(error));
      } finally {
        if (!cancel) {
          setIsLoading(false);
        }
      }
    }
    fetchData();

    return () => {
      cancel = true;
    };
  }, [params.query, params.assignedTo, params.state]);

  return { issues, error, isLoading };
}
