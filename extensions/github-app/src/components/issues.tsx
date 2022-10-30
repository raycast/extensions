import { Action, ActionPanel, Color, Detail, Icon, Image, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getGitHubAPI, Issue, IssueState, Label, Project, Repo, User } from "../github";
import { getErrorMessage } from "../utils";
import { MyReposDropdown, useMyRepos } from "./repositories/list";

export interface IssueSearchParams {
  query?: string;
  assignedTo?: string;
  state?: IssueState;
  repo?: string;
}

export function LabelTagList(props: { labels: Label[] | undefined }): JSX.Element | null {
  const labels = props.labels;
  if (!labels || labels.length <= 0) {
    return null;
  }
  return (
    <Detail.Metadata.TagList title="Labels">
      {labels?.map((l) => (
        <LabelTagItem key={l.id} label={l} />
      ))}
    </Detail.Metadata.TagList>
  );
}

export function LabelTagItem(props: { label: Label }): JSX.Element {
  const l = props.label;
  return <Detail.Metadata.TagList.Item text={l.name || "?"} icon={undefined} color={l.color} />;
}

export function UserTagListList(props: { user: User }): JSX.Element {
  const u = props.user;
  return <Detail.Metadata.TagList.Item text={u.login} icon={{ source: u.avatar_url, mask: Image.Mask.Circle }} />;
}

export function AuthorTagList(props: { user: User }): JSX.Element {
  const u = props.user;
  return (
    <Detail.Metadata.TagList title="Author">
      <UserTagListList user={u} />
    </Detail.Metadata.TagList>
  );
}

export function UserTagList(props: {
  users: User[] | null | undefined;
  title?: string | undefined;
}): JSX.Element | null {
  const users = props.users;
  if (!users || users.length <= 0) {
    return null;
  }
  return (
    <Detail.Metadata.TagList title={props.title || ""}>
      {users?.map((u) => (
        <UserTagListList key={u.login} user={u} />
      ))}
    </Detail.Metadata.TagList>
  );
}

function IssueDetail(props: { issue: Issue }): JSX.Element {
  const i = props.issue;
  const parts: string[] = [`# ${i.title}`];
  if (i.body && i.body.length > 0) {
    parts.push(i.body);
  }
  const md = parts.join("\n");
  return (
    <Detail
      markdown={md}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item text={getState(i)} color={getColorByState(i)} />
          </Detail.Metadata.TagList>
          <AuthorTagList user={i.user} />
          <LabelTagList labels={i.labels} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <IssueOpenInBrowserAction issue={i} />
        </ActionPanel>
      }
    />
  );
}

function IssueOpenInBrowserAction(props: { issue: Issue }): JSX.Element {
  const i = props.issue;
  return <Action.OpenInBrowser url={i.html_url} />;
}

function getColorByState(issue: Issue): Color {
  return issue.state === "open" ? Color.Green : Color.Red;
}

function getIconByState(issue: Issue): Image.ImageLike {
  return { source: "exclamation.png", tintColor: getColorByState(issue) };
}

function getState(issue: Issue): string {
  return issue.state === "open" ? "Open" : "Closed";
}

export function IssueItem(props: { issue: Issue }): JSX.Element {
  const i = props.issue;
  return (
    <List.Item
      key={i.id.toString()}
      title={i.title}
      subtitle={`#${i.number}`}
      icon={{ value: getIconByState(i), tooltip: getState(i) }}
      accessories={[
        { date: new Date(i.updated_at) },
        { icon: { source: i.user?.avatar_url, mask: Image.Mask.Circle }, tooltip: i.user.login },
      ]}
      actions={
        <ActionPanel>
          <Action.Push title="Open Issue" icon={Icon.Terminal} target={<IssueDetail issue={i} />} />
          <IssueOpenInBrowserAction issue={i} />
        </ActionPanel>
      }
    />
  );
}

export function MyAssingedIssues(): JSX.Element {
  const [searchtext, setSearchtext] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<Project>();
  const { projects: repos } = useMyRepos();
  const { issues, error, isLoading } = useIssues({
    query: searchtext,
    assignedTo: "@me",
    state: IssueState.open,
    repo: selectedRepo ? selectedRepo.full_name : undefined,
  });
  if (error) {
    showToast({ style: Toast.Style.Failure, message: error, title: "Could not fetch Issues" });
  }
  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchtext}
      throttle
      searchBarAccessory={<MyReposDropdown repos={repos} onChange={setSelectedRepo} />}
    >
      <List.Section title="Your Assigned Issues" subtitle={`${issues?.length}`}>
        {issues?.map((i) => (
          <IssueItem key={i.id} issue={i} />
        ))}
      </List.Section>
    </List>
  );
}

export function MyCreatedIssues(): JSX.Element {
  const [searchtext, setSearchtext] = useState("");
  const { issues, error, isLoading } = useIssues({ query: searchtext, assignedTo: "@me" });
  if (error) {
    showToast({ style: Toast.Style.Failure, message: error, title: "Could not fetch Issues" });
  }
  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchtext} throttle>
      <List.Section title="Created Recently" subtitle={`${issues?.length}`}>
        {issues?.map((i) => (
          <IssueItem key={i.id} issue={i} />
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
        if (params.repo && params.repo.length > 0) {
          searchParts.push(`repo:${params.repo}`);
        }
        if (params.query) {
          searchParts.push(params.query);
        }
        const q = searchParts.join(" ");
        const d = await octokit.rest.search.issuesAndPullRequests({
          q: q, //`type:issue assignee:@me is:open sort:updated ${query}`, // author:@me
        });
        const data: Issue[] | undefined = d.data?.items?.map((p) => {
          return {
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
            labels: p.labels as Label[] | undefined,
          } as Issue;
        });
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
  }, [params.query, params.assignedTo, params.state, params.repo]);

  return { issues, error, isLoading };
}
