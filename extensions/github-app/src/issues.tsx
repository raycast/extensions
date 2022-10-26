import { Action, ActionPanel, getPreferenceValues, Image, List, showToast, Toast } from "@raycast/api";
import { Octokit } from "octokit";
import { useEffect, useState } from "react";
import { getErrorMessage } from "./utils";

interface Repo {
  id: number;
  name: string;
  full_name: string;
}

interface User {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string;
  html_url: string;
  type: string;
}

interface Issue {
  id: number;
  number: number;
  url: string;
  title: string;
  html_url: string;
  body_text: string;
  repository?: Repo;
  //milestone
  user: User;
  updated_at: string;
  created_at: string;
  // labels[]
}

export default function IssuesCommand(): JSX.Element {
  const { issues, error, isLoading } = useIssues("");
  if (error) {
    showToast({ style: Toast.Style.Failure, message: error, title: "Could not fetch Issues" });
  }
  return (
    <List isLoading={isLoading}>
      {issues?.map((i) => (
        <List.Item
          key={i.id.toString()}
          title={i.title}
          subtitle={`#${i.number}`}
          icon={{ source: i.user?.avatar_url, mask: Image.Mask.Circle }}
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
      ))}
    </List>
  );
}

function useIssues(query: string | undefined): {
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
        const prefs = getPreferenceValues();
        const pat = (prefs.pat as string) || undefined;

        const octokit = new Octokit({ auth: pat });
        const d = await octokit.rest.search.issuesAndPullRequests({ q: "type:issue author:@me is:open sort:updated" });
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
  }, [query]);

  return { issues, error, isLoading };
}
