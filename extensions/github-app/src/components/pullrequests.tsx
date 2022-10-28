import { Action, ActionPanel, Color, Detail, Icon, Image, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getGitHubAPI, Label, Project, PullRequest, PullRequest as PullRequestItem, Repo, User } from "../github";
import { getErrorMessage } from "../utils";
import { AuthorTagList, LabelTagList } from "./issues";

interface PullRequestSearchParams {
  query?: string;
  author?: string;
  repo?: string;
}

function getColorByState(pr: PullRequestItem): Color {
  if (pr.state.toLowerCase() === "closed") {
    return pr.merged_at ? Color.Purple : Color.Red;
  } else if (pr.state.toLowerCase() === "merged") {
    return Color.Purple;
  }
  return Color.Green;
}

function getIconByState(pr: PullRequestItem): Image.ImageLike {
  const state = pr.state.toLowerCase();
  if (state === "closed") {
    if (pr.merged_at) {
      return { source: "prmerged.png", tintColor: Color.Purple };
    } else {
      return { source: "propen.png", tintColor: Color.Red };
    }
  } else if (state === "merged") {
    return { source: "prmerged.png", tintColor: Color.Purple };
  } else return { source: "propen.png", tintColor: Color.Green };
}

function getState(pr: PullRequestItem): string {
  const state = pr.state.toLowerCase();
  if (state === "closed") {
    return pr.merged_at ? "Merged" : "Closed";
  } else if (state === "merged") {
    return "Merged";
  }
  return "Open";
}

function PullRequestDetail(props: { pr: PullRequestItem }): JSX.Element {
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

function PullRequestOpenInBrowerAction(props: { pr: PullRequestItem }): JSX.Element {
  const pr = props.pr;
  return <Action.OpenInBrowser url={pr.html_url} />;
}

const CheckStatusMap: Record<string, string> = {
  QUEUED: "Queued",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  WAITING: "Waiting",
  PENDING: "Pending",
  REQUESTED: "Requested",
};

const CheckConclusionMap: Record<string, string> = {
  ACTION_REQUIRED: "Action Required",
  TIMED_OUT: "Timed Out",
  CANCELLED: "Cancelled",
  FAILURE: "Failure",
  SUCCESS: "Success",
  NEUTRAL: "Neutral",
  SKIPPED: "Skipped",
  STARTUP_FAILURE: "Startup Failure",
  STALE: "Stale",
};

const CheckConclusionIcon: Record<string, string> = {
  ACTION_REQUIRED: "❗",
  TIMED_OUT: "🕰️",
  CANCELLED: "⛔",
  FAILURE: "❌",
  SUCCESS: "✅",
  NEUTRAL: "🧪",
  SKIPPED: "⛔",
  STARTUP_FAILURE: "❌",
  STALE: "🧦",
};

function getCheckStatus(pr: PullRequest): {
  checkStatusIcon?: Image.ImageLike | undefined;
  checkStatusText: string | undefined;
} {
  const status = pr.commit?.checksuite?.status;
  if (status === "COMPLETED") {
    const conclusion = pr.commit?.checksuite?.conclusion;
    return {
      checkStatusText: CheckConclusionMap[conclusion || ""],
      checkStatusIcon: { source: CheckConclusionIcon[conclusion || ""] },
    };
  }
  return {
    checkStatusText: status ? CheckStatusMap[status || ""] || status : undefined,
    checkStatusIcon: status ? { source: "⏱️" } : undefined,
  };
}

function PullRequestItem(props: { pr: PullRequestItem }): JSX.Element {
  const pr = props.pr;
  const { checkStatusText, checkStatusIcon } = getCheckStatus(pr);
  return (
    <List.Item
      key={pr.id.toString()}
      title={pr.title}
      subtitle={`#${pr.number}`}
      icon={{ value: getIconByState(pr), tooltip: getState(pr) }}
      accessories={[
        { text: pr.draft !== undefined && pr.draft === true ? "[Draft]" : undefined },
        { icon: checkStatusIcon, tooltip: checkStatusText },
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
  const { prs, error, isLoading } = usePullRequests({ query: query, author: "@me" });
  if (error) {
    showToast({ style: Toast.Style.Failure, message: error, title: "Could not fetch Pull Requests" });
  }
  const openPrs = prs?.filter((pr) => pr.state.toLowerCase() === "open");
  const closedPrs = prs?.filter((pr) => pr.state.toLowerCase() === "closed" || pr.state.toLowerCase() === "merged");
  const openText = openPrs ? `${openPrs.length} Pull Requests` : undefined;
  const closedText = closedPrs ? `${closedPrs.length} Pull Requests` : undefined;

  return (
    <List isLoading={isLoading} onSearchTextChange={setQuery} throttle>
      <List.Section title="Open" subtitle={openText}>
        {openPrs?.map((pr) => (
          <PullRequestItem key={pr.id} pr={pr} />
        ))}
      </List.Section>
      <List.Section title="Recently Closed" subtitle={closedText}>
        {closedPrs?.map((pr) => (
          <PullRequestItem key={pr.id} pr={pr} />
        ))}
      </List.Section>
    </List>
  );
}

export function SearchPullRequests(): JSX.Element {
  const [query, setQuery] = useState("");
  const { prs, error, isLoading } = usePullRequests({ query: query, author: "@me" });
  if (error) {
    showToast({ style: Toast.Style.Failure, message: error, title: "Could not fetch Pull Requests" });
  }
  console.log(prs?.length);
  const openPrs = prs?.filter((pr) => pr.state.toLowerCase() === "open");
  const closedPrs = prs?.filter((pr) => pr.state.toLowerCase() === "closed");
  const openText = openPrs ? `${openPrs.length} Pull Requests` : undefined;
  const closedText = closedPrs ? `${closedPrs.length} Pull Requests` : undefined;
  console.log(openPrs?.length);

  return (
    <List isLoading={isLoading} onSearchTextChange={setQuery} throttle>
      <List.Section title="Open" subtitle={openText}>
        {openPrs?.map((pr) => (
          <PullRequestItem key={pr.id} pr={pr} />
        ))}
      </List.Section>
      <List.Section title="Recently Closed" subtitle={closedText}>
        {closedPrs?.map((pr) => (
          <PullRequestItem key={pr.id} pr={pr} />
        ))}
      </List.Section>
    </List>
  );
}

export function ProjectPullRequests(props: { repo: Project }): JSX.Element {
  const repo = props.repo;
  const [query, setQuery] = useState("");
  const { prs, error, isLoading } = usePullRequests({ query: query, repo: repo.full_name });
  if (error) {
    showToast({ style: Toast.Style.Failure, message: error, title: "Could not fetch Pull Requests" });
  }
  const openPrs = prs?.filter((pr) => pr.state.toLowerCase() === "open");
  const closedPrs = prs?.filter((pr) => pr.state.toLowerCase() === "closed");
  const openText = openPrs ? `${openPrs.length} Pull Requests` : undefined;
  const closedText = closedPrs ? `${closedPrs.length} Pull Requests` : undefined;

  return (
    <List isLoading={isLoading} onSearchTextChange={setQuery} throttle>
      <List.Section title="Open" subtitle={openText}>
        {openPrs?.map((pr) => (
          <PullRequestItem key={pr.id} pr={pr} />
        ))}
      </List.Section>
      <List.Section title="Recently Closed" subtitle={closedText}>
        {closedPrs?.map((pr) => (
          <PullRequestItem key={pr.id} pr={pr} />
        ))}
      </List.Section>
    </List>
  );
}

function usePullRequests(params: PullRequestSearchParams): {
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
        const qd = await getPullRequests(params);
        if (!cancel) {
          console.log("set", qd?.length);
          setPrs(qd);
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
  }, [params.author, params.query, params.repo]);

  return { prs, error, isLoading };
}

async function getPullRequests(params: PullRequestSearchParams): Promise<PullRequest[] | undefined> {
  const octokit = getGitHubAPI();
  const searchParts = ["type:pr", "sort:updated"];
  if (params.author) {
    searchParts.push(`author:${params.author}`);
  }
  if (params.repo) {
    searchParts.push(`repo:${params.repo}`);
  }
  if (params.query) {
    searchParts.push(params.query);
  }
  const q = searchParts.join(" ");
  console.log(q);
  const qd = await octokit.graphql(`
    {
      search(first: 50, type: ISSUE, query: "${q}") {
        edges {
          node {
            ... on PullRequest {
              id
              title
              number
              state
              url
              body
              bodyText
              isDraft
              updatedAt
              createdAt
              labels(first: 100){
                nodes{
                  id
                  name
                  description
                  color
                  isDefault
                }
              }
              author{
                login
                avatarUrl
                url
              }
              commits(last: 1) {
                nodes {
                  commit {
                    checkSuites(last: 1) {
                      nodes {
                        status
                        conclusion
                        workflowRun {
                          id
                        }
                      }
                    }
                    commitUrl
                    oid
                  }
                }
              }
            }
          }
        }
      }
    }
    `);
  const rawSearchEdges = (qd as any).search.edges as any[] | undefined;
  const searchEdges = rawSearchEdges?.filter((e) => e.node && Object.keys(e.node).length > 0);
  const result = searchEdges?.map((e) => {
    const n = e.node;
    const author = n.author;
    const commit = n.commits?.nodes[0].commit;
    const data = {
      id: n.id,
      number: n.number,
      url: n.url,
      title: n.title,
      html_url: n.url,
      body: n.body,
      body_text: n.bodyText,
      draft: n.isDraft,
      updated_at: n.updatedAt,
      created_at: n.createdAt,
      state: n.state as string,
      user: {
        login: author.login,
        avatar_url: author.avatarUrl,
        html_url: author.url,
      },
      commit: {
        oid: commit?.oid,
        commit_url: commit?.commitUrl,
        checksuite: {
          status: commit?.checkSuites?.nodes[0]?.status,
          conclusion: commit?.checkSuites?.nodes[0]?.conclusion,
        },
      },
      labels: n?.labels?.nodes?.map((l: any) => {
        return {
          id: l.id,
          name: l.name,
          color: l.color,
          default: l.default,
          description: l.description,
          is_default: l.isDefault,
        } as Label;
      }),
    } as PullRequest;
    return data;
  });
  return result;
}
