import { List, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { getGitHubAPI, Issue, Label, Project, Repo, User } from "../../github";
import { getErrorMessage } from "../../utils";
import { IssueItem, IssueSearchParams } from "../issues";

export function ProjectIssueList(props: { project: Project }): JSX.Element {
  const [searchtext, setSearchtext] = useState("");
  const { issues, error, isLoading } = useProjectIssues(props.project, { query: searchtext });
  if (error) {
    showToast({ style: Toast.Style.Failure, title: "Could not fetch project issues", message: error });
  }
  return (
    <List isLoading={isLoading} throttle onSearchTextChange={setSearchtext}>
      <List.Section title={searchtext.length === 0 ? "Recent Updated Issues" : "Issues"} subtitle={`${issues?.length}`}>
        {issues?.map((i) => (
          <IssueItem key={i.id} issue={i} />
        ))}
      </List.Section>
    </List>
  );
}

function useProjectIssues(
  repo: Project,
  params: IssueSearchParams
): {
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
        const searchParts = ["type:issue", "sort:updated", `repo:${repo.full_name}`];
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
        console.log(q);
        const d = await octokit.rest.search.issuesAndPullRequests({
          q: q, //`type:issue assignee:@me is:open sort:updated ${query}`, // author:@me
        });
        const data: Issue[] | undefined = d.data?.items?.map((p) => ({
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
  }, [repo, params.query, params.assignedTo, params.state]);

  return { issues, error, isLoading };
}
