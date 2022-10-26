import { Action, ActionPanel, Color, Detail, Icon, Image, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getGitHubAPI, Label, PullRequest, Repo, User } from "../github";
import { getErrorMessage } from "../utils";
import { AuthorTagList, LabelTagList } from "./issues";

function getColorByState(pr: PullRequest): Color {
  if (pr.state === "closed") {
    return pr.merged_at ? Color.Purple : Color.Red;
  }
  return Color.Green;
}

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

function getState(pr: PullRequest): string {
  if (pr.state === "closed") {
    return pr.merged_at ? "Merged" : "Closed";
  }
  return "Open";
}

function PullRequestDetail(props: { pr: PullRequest }): JSX.Element {
  const pr = props.pr;
  const parts: string[] = [`# ${pr.title}`];
  if (pr.body && pr.body.length > 0) {
    parts.push(pr.body);
  }
  const md = parts.join("\n");
  return (
    <Detail
      markdown={md}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item text={getState(pr)} color={getColorByState(pr)} />
          </Detail.Metadata.TagList>
          <AuthorTagList user={pr.user} />
          <LabelTagList labels={pr.labels} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <PullRequestOpenInBrowerAction pr={pr} />
        </ActionPanel>
      }
    />
  );
}

function PullRequestOpenInBrowerAction(props: { pr: PullRequest }): JSX.Element {
  const pr = props.pr;
  return <Action.OpenInBrowser url={pr.html_url} />;
}

function PullRequest(props: { pr: PullRequest }): JSX.Element {
  const pr = props.pr;
  return (
    <List.Item
      key={pr.id.toString()}
      title={pr.title}
      subtitle={`#${pr.number}`}
      icon={{ value: getIconByState(pr), tooltip: getState(pr) }}
      accessories={[
        { date: new Date(pr.updated_at) },
        { icon: { source: pr.user?.avatar_url, mask: Image.Mask.Circle }, tooltip: pr.user.login },
      ]}
      actions={
        <ActionPanel>
          <Action.Push title="Open Pull Request" icon={Icon.Terminal} target={<PullRequestDetail pr={pr} />} />
          <PullRequestOpenInBrowerAction pr={pr} />
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
        const octokit = getGitHubAPI();
        const d = await octokit.rest.search.issuesAndPullRequests({
          q: `type:pr author:@me sort:updated ${query}`,
        });
        const data: PullRequest[] | undefined = d.data?.items?.map((p) => ({
          id: p.id,
          number: p.number,
          title: p.title,
          url: p.url,
          html_url: p.html_url,
          body: p.body,
          body_text: p.body_text,
          repository: p.repository as Repo | undefined,
          user: p.user as User | undefined,
          created_at: p.created_at,
          updated_at: p.updated_at,
          state: p.state,
          state_reason: p.state_reason,
          merged_at: p.pull_request?.merged_at,
          labels: p.labels as Label[] | undefined,
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
