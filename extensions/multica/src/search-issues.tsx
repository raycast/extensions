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

const PAGE_SIZE = 50;

/** Open issues by recent activity, or search results across all issues, a page at a time. */
function fetchIssues(workspaceId: string, query: string) {
  return async ({ page }: { page: number }): Promise<{ data: SearchIssue[]; hasMore: boolean }> => {
    const offset = page * PAGE_SIZE;
    if (query) {
      const { issues } = await searchIssues(workspaceId, query, PAGE_SIZE, offset);
      return { data: issues, hasMore: issues.length === PAGE_SIZE };
    }
    const { issues, total } = await listIssues(workspaceId, {
      status_category: "unstarted,started",
      sort: "updated_at",
      direction: "desc",
      limit: PAGE_SIZE,
      offset,
    });
    return { data: issues, hasMore: offset + issues.length < total };
  };
}

export default function SearchIssues() {
  const [searchText, setSearchText] = useState("");
  const query = searchText.trim();
  const { workspaces, workspace, setWorkspaceId, isLoading: workspaceLoading, error } = useWorkspace();
  const { context, isLoading: contextLoading } = useWorkspaceContext(workspace);

  const { data, isLoading, revalidate, pagination } = useCachedPromise(fetchIssues, [workspace?.id ?? "", query], {
    execute: Boolean(workspace),
    keepPreviousData: true,
  });
  // keepPreviousData briefly holds the old workspace's results after a switch; never pair them
  // with the new workspace's context, or their actions would target the wrong workspace.
  const issues = data?.filter((issue) => issue.workspace_id === context?.workspace.id);

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
      pagination={pagination}
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
