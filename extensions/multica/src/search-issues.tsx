import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { ErrorEmptyView } from "./components/ErrorEmptyView";
import { IssueListItem } from "./components/IssueListItem";
import { WorkspaceDropdown } from "./components/WorkspaceDropdown";
import { listIssues, searchIssues } from "./lib/api";
import { statusName, statusRank } from "./lib/format";
import { useWorkspace, useWorkspaceContext } from "./lib/hooks";
import type { Issue, SearchIssue } from "./lib/types";

async function fetchIssues(workspaceId: string, query: string): Promise<SearchIssue[]> {
  if (query) return (await searchIssues(workspaceId, query)).issues;
  return (
    await listIssues(workspaceId, {
      status_category: "unstarted,started",
      sort: "updated_at",
      direction: "desc",
      limit: 100,
    })
  ).issues;
}

export default function SearchIssues() {
  const [searchText, setSearchText] = useState("");
  const query = searchText.trim();
  const { workspaces, workspace, setWorkspaceId, isLoading: workspaceLoading, error } = useWorkspace();
  const { context, isLoading: contextLoading } = useWorkspaceContext(workspace);

  const {
    data: issues,
    isLoading,
    revalidate,
  } = useCachedPromise(fetchIssues, [workspace?.id ?? "", query], {
    execute: Boolean(workspace),
    keepPreviousData: true,
  });

  if (error && !workspaces) {
    return (
      <List>
        <ErrorEmptyView error={error} />
      </List>
    );
  }

  // Without a query, group open issues by status; search results stay in relevance order.
  const groups = new Map<string, Issue[]>();
  if (!query) {
    const sorted = [...(issues ?? [])].sort(
      (a, b) => statusRank(a.status, context?.statuses) - statusRank(b.status, context?.statuses),
    );
    for (const issue of sorted) groups.set(issue.status, [...(groups.get(issue.status) ?? []), issue]);
  }

  const loading = workspaceLoading || contextLoading || isLoading;

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder={workspace ? `Search issues in ${workspace.name}` : "Search issues"}
      onSearchTextChange={setSearchText}
      filtering={false}
      throttle
      searchBarAccessory={<WorkspaceDropdown workspaces={workspaces} value={workspace} onChange={setWorkspaceId} />}
    >
      {!loading && (
        <List.EmptyView
          title={query ? "No matching issues" : "No open issues"}
          description={query ? "Closed issues are included in search results." : undefined}
        />
      )}
      {context &&
        (query ? (
          <List.Section title="Results" subtitle={String(issues?.length ?? 0)}>
            {issues?.map((issue) => (
              <IssueListItem
                key={issue.id}
                issue={issue}
                context={context}
                onChange={revalidate}
                snippet={issue.matched_snippet ?? issue.matched_description_snippet ?? issue.matched_comment_snippet}
              />
            ))}
          </List.Section>
        ) : (
          [...groups].map(([status, group]) => (
            <List.Section
              key={status}
              title={group[0].status_name ?? statusName(status, context.statuses)}
              subtitle={String(group.length)}
            >
              {group.map((issue) => (
                <IssueListItem key={issue.id} issue={issue} context={context} onChange={revalidate} />
              ))}
            </List.Section>
          ))
        ))}
    </List>
  );
}
