import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getGitHubAPI, Project } from "../../github";
import { getErrorMessage } from "../../utils";
import { ProjectPullRequests } from "../pullrequests";
import { ProjectIssueList } from "./issues";

function RepoOpenInBrowserAction(props: { project: Project }): JSX.Element {
  const p = props.project;
  return <Action.OpenInBrowser url={p.html_url} />;
}

function RepoNavList(props: { repo: Project }): JSX.Element {
  return (
    <List>
      <List.Item
        title="Issues"
        icon={{ source: "exclamation.png", tintColor: Color.PrimaryText }}
        actions={
          <ActionPanel>
            <Action.Push title="Open Issues" icon={Icon.Terminal} target={<ProjectIssueList project={props.repo} />} />
          </ActionPanel>
        }
      />
      <List.Item
        title="Pull Requests"
        icon={{ source: "propen.png", tintColor: Color.PrimaryText }}
        actions={
          <ActionPanel>
            <Action.Push title="Open Pull Requests" target={<ProjectPullRequests repo={props.repo} />} />
          </ActionPanel>
        }
      />
    </List>
  );
}

function RepoItem(props: { repo: Project }): JSX.Element {
  const r = props.repo;
  return (
    <List.Item
      key={r.id.toString()}
      title={r.full_name}
      icon={r.owner_avatar_url}
      accessories={[{ text: `⭐ ${r.stargazers_count}` }]}
      actions={
        <ActionPanel>
          <Action.Push title="Open Project" icon={Icon.Terminal} target={<RepoNavList repo={r} />} />
          <RepoOpenInBrowserAction project={r} />
        </ActionPanel>
      }
    />
  );
}

export function MyRepos(): JSX.Element {
  const { projects, error, isLoading } = useMyRepos("");
  if (error) {
    showToast({ style: Toast.Style.Failure, message: error, title: "Could not fetch Issues" });
  }
  return (
    <List isLoading={isLoading}>
      <List.Section title="Projects" subtitle={`${projects?.length}`}>
        {projects?.map((p) => (
          <RepoItem key={p.id} repo={p} />
        ))}
      </List.Section>
    </List>
  );
}

function useMyRepos(query: string | undefined): {
  projects: Project[] | undefined;
  error?: string;
  isLoading: boolean | undefined;
} {
  const [projects, setProjects] = useState<Project[]>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    async function fetchData() {
      setIsLoading(true);
      setError(undefined);
      try {
        const octokit = getGitHubAPI();
        const d = await octokit.paginate(
          octokit.rest.repos.listForAuthenticatedUser,
          {
            per_page: 100,
          },
          (response) => response.data
        );
        const pros: Project[] = d?.map((p) => ({
          id: p.id,
          name: p.name,
          full_name: p.full_name,
          owner_avatar_url: p.owner?.avatar_url,
          stargazers_count: p.stargazers_count,
          html_url: p.html_url,
        }));
        if (!cancel) {
          setProjects(pros);
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

  return { projects, error, isLoading };
}

export function RepoList(): JSX.Element {
  const [searchtext, setSearchtext] = useState("");
  const { repos, error, isLoading } = useRepos(searchtext);
  if (error) {
    showToast({ style: Toast.Style.Failure, title: "Could not fetch Repositories", message: error });
  }
  return (
    <List
      isLoading={isLoading}
      throttle
      onSearchTextChange={setSearchtext}
      searchBarPlaceholder="Search for Repositories"
    >
      {repos?.map((r) => (
        <RepoItem key={r.id} repo={r} />
      ))}
      <List.EmptyView title="Type query e.g. 'raycast'" />
    </List>
  );
}

export function useRepos(query: string): {
  repos: Project[] | undefined;
  error?: string;
  isLoading: boolean | undefined;
} {
  const [repos, setRepos] = useState<Project[]>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    async function fetchData() {
      setIsLoading(true);
      setError(undefined);
      try {
        if (!query) {
          if (!cancel) {
            setRepos([]);
          }
        } else {
          const octokit = getGitHubAPI();
          const d = await octokit.rest.search.repos({ q: query });
          const pros: Project[] = d.data?.items?.map((p) => ({
            id: p.id,
            name: p.name,
            full_name: p.full_name,
            owner_avatar_url: p.owner?.avatar_url,
            stargazers_count: p.stargazers_count,
            html_url: p.html_url,
          }));
          if (!cancel) {
            setRepos(pros);
          }
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

  return { repos, error, isLoading };
}
