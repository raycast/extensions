import { Action, ActionPanel, Color, getPreferenceValues, Image, List, showToast, Toast } from "@raycast/api";
import { Octokit } from "octokit";
import { useEffect, useState } from "react";
import { PullRequest, Repo, User } from "../github";
import { getErrorMessage } from "../utils";

function getIconByState(pr: PullRequest): Image.ImageLike {
  if (pr.state === "closed") {
    if (pr.merged_at) {
      return { source: "prmerged.png", tintColor: Color.Purple };
    } else {
      return { source: "propen.png", tintColor: Color.Red };
    }
  }
  return { source: "propen.png", tintColor: Color.Green };
}

function getTooltip(pr: PullRequest): string {
  if (pr.state === "closed") {
    return pr.merged_at ? "Merged" : "Closed";
  }
  return "Open";
}

function PullRequest(props: { pr: PullRequest }): JSX.Element {
  const pr = props.pr;
  return (
    <List.Item
      key={pr.id.toString()}
      title={pr.title}
      subtitle={`#${pr.number}`}
      icon={{ value: getIconByState(pr), tooltip: getTooltip(pr) }}
      accessories={[
        { date: new Date(pr.updated_at) },
        { icon: { source: pr.user?.avatar_url, mask: Image.Mask.Circle }, tooltip: pr.user.login },
      ]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={pr.html_url} />
        </ActionPanel>
      }
    />
  );
}

export function MyPullRequests(): JSX.Element {
  const [query, setQuery] = useState("");
  const { prs, error, isLoading } = usePullRequests(query);
  if (error) {
    showToast({ style: Toast.Style.Failure, message: error, title: "Could not fetch Pull Requests" });
  }
  const openPrs = prs?.filter((pr) => pr.state === "open");
  const closedPrs = prs?.filter((pr) => pr.state === "closed");
  const openText = openPrs ? `${openPrs.length} Pull Requests` : undefined;
  const closedText = closedPrs ? `${closedPrs.length} Pull Requests` : undefined;

  return (
    <List isLoading={isLoading} onSearchTextChange={setQuery} throttle>
      <List.Section title="Open" subtitle={openText}>
        {openPrs?.map((pr) => (
          <PullRequest key={pr.id} pr={pr} />
        ))}
      </List.Section>
      <List.Section title="Recently Closed" subtitle={closedText}>
        {closedPrs?.map((pr) => (
          <PullRequest key={pr.id} pr={pr} />
        ))}
      </List.Section>
    </List>
  );
}

function usePullRequests(query: string | undefined): {
  prs: PullRequest[] | undefined;
  error?: string;
  isLoading: boolean | undefined;
} {
  const [prs, setPrs] = useState<PullRequest[]>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    async function fetchData() {
      setIsLoading(true);
      setError(undefined);
      try {
        const prefs = getPreferenceValues();
        const pat = (prefs.pat as string) || undefined;

        const octokit = new Octokit({ auth: pat });
        const d = await octokit.rest.search.issuesAndPullRequests({
          q: `type:pr author:@me sort:updated ${query}`,
        });
        const data: PullRequest[] | undefined = d.data?.items?.map((p) => ({
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
          state_reason: p.state_reason,
          merged_at: p.pull_request?.merged_at,
        }));
        if (!cancel) {
          setPrs(data);
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
  }, [query]);

  return { prs, error, isLoading };
}
