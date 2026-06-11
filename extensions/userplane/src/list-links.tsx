import { Action, ActionPanel, Color, Icon, List, LocalStorage, Toast, showToast } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";

import type { LinkSortField, LinksQuery, ListLinksFilters, SortDirection } from "./api/types";
import { CommonActions } from "./components/common-actions";
import { useLinks } from "./hooks/use-links";
import { useWorkspaces } from "./hooks/use-workspaces";
import { DEFAULT_FILTERS, FiltersScreen } from "./list-links-filters";
import { dashLinkRecordingsUrl, dashLinksUrl } from "./utils/dash-urls";
import { formatRelativeTime } from "./utils/format";

const LAST_WORKSPACE_KEY = "userplane:lastWorkspaceId";

function isFiltered(filters: ListLinksFilters): boolean {
  return (
    filters.projectIds.length > 0 ||
    filters.domainIds.length > 0 ||
    filters.creatorIds.length > 0 ||
    filters.sortBy !== "created_at" ||
    filters.sortDirection !== "desc"
  );
}

function buildQueryFromFilters(filters: ListLinksFilters): LinksQuery {
  const query: LinksQuery = {
    sort_by: filters.sortBy,
    sort_direction: filters.sortDirection,
  };
  if (filters.creatorIds.length > 0) query.created_by = filters.creatorIds;
  if (filters.projectIds.length > 0) query.project_id = filters.projectIds;
  if (filters.domainIds.length > 0) query.domain_id = filters.domainIds;
  return query;
}

export default function ListLinksCommand() {
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [bootstrapped, setBootstrapped] = useState(false);

  const workspaces = useWorkspaces();

  useEffect(() => {
    void (async () => {
      const stored = await LocalStorage.getItem<string>(LAST_WORKSPACE_KEY);
      if (stored) setWorkspaceId(stored);
      setBootstrapped(true);
    })();
  }, []);

  useEffect(() => {
    const list = workspaces.data?.workspaces;
    if (!list || list.length === 0 || !bootstrapped) return;
    if (workspaceId && list.some((w) => w.workspaceId === workspaceId)) return;
    setWorkspaceId(list[0].workspaceId);
  }, [workspaces.data, workspaceId, bootstrapped]);

  useEffect(() => {
    if (workspaceId) void LocalStorage.setItem(LAST_WORKSPACE_KEY, workspaceId);
  }, [workspaceId]);

  const currentWorkspace = workspaces.data?.workspaces.find((w) => w.workspaceId === workspaceId);
  const currentMemberId = currentWorkspace?.workspaceMembership?.workspaceMemberId;

  const filterCacheKey = workspaceId ? `list-links:filters:${workspaceId}` : "list-links:filters:none";
  const [filters, setFilters] = useCachedState<ListLinksFilters>(filterCacheKey, DEFAULT_FILTERS);

  const query = useMemo(() => buildQueryFromFilters(filters), [filters]);

  const linksWorkspaceId = bootstrapped && !workspaces.isLoading && workspaceId ? workspaceId : undefined;
  const links = useLinks(linksWorkspaceId, query);

  const items = links.data;
  const isLoading = workspaces.isLoading || links.isLoading;
  const workspaceList = workspaces.data?.workspaces ?? [];
  const dashboardAllUrl = dashLinksUrl({
    workspaceId: workspaceId || undefined,
    creators: filters.creatorIds.length > 0 ? filters.creatorIds : undefined,
  });

  function setSort(sortBy: LinkSortField, sortDirection: SortDirection) {
    setFilters({ ...filters, sortBy, sortDirection });
  }

  function clearFilters() {
    setFilters({ ...DEFAULT_FILTERS });
  }

  async function notifyCopied() {
    await showToast({ style: Toast.Style.Success, title: "URL copied" });
  }

  return (
    <List isLoading={isLoading} filtering={false}>
      <List.EmptyView
        icon={Icon.Link}
        title={isLoading ? "Loading links…" : "No links"}
        description={
          isLoading
            ? undefined
            : isFiltered(filters)
              ? "No links match these filters. Clear them to see everything."
              : "You haven't created any links in this workspace yet. Use Create Recording Link to make your first one."
        }
        actions={
          <ActionPanel>
            {workspaceId ? (
              <Action.Push
                title="Filter & Sort…"
                icon={Icon.Filter}
                target={
                  <FiltersScreen
                    workspaceId={workspaceId}
                    value={filters}
                    currentMemberId={currentMemberId}
                    onChange={setFilters}
                  />
                }
              />
            ) : null}
            <Action title="Clear Filters" icon={Icon.XMarkCircle} onAction={clearFilters} />
            <CommonActions workspaceId={workspaceId || undefined} currentWorkspaceMemberId={currentMemberId} />
          </ActionPanel>
        }
      />
      {items.map((link) => {
        const title = link.linkTitle || link.domain.url;
        const createdLabel = formatRelativeTime(link.createdAt);
        const subtitleParts = [link.creator.name, link.domain.url];
        if (createdLabel) subtitleParts.push(createdLabel);
        const accessories: List.Item.Accessory[] = [
          {
            icon: link.linkReusable ? Icon.Repeat : Icon.Link,
            tooltip: link.linkReusable ? "Reusable" : "Single-use",
          },
        ];
        if (link.project.title) {
          accessories.unshift({
            tag: { value: link.project.title, color: Color.Blue },
            tooltip: "Project",
          });
        }
        return (
          <List.Item
            key={link.linkId}
            icon={{
              source: link.linkReusable ? Icon.Repeat : Icon.Link,
              tintColor: link.linkReusable ? Color.Green : Color.SecondaryText,
            }}
            title={title}
            subtitle={subtitleParts.join(" · ")}
            accessories={accessories}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Link">
                  <Action.CopyToClipboard
                    title="Copy Link URL"
                    icon={Icon.CopyClipboard}
                    content={link.linkURL}
                    onCopy={() => {
                      void notifyCopied();
                    }}
                  />
                  <Action.OpenInBrowser title="Open Link" icon={Icon.Globe} url={link.linkURL} />
                  {workspaceId ? (
                    <Action.OpenInBrowser
                      title="View Recordings for This Link"
                      icon={Icon.Video}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      url={dashLinkRecordingsUrl(workspaceId, link.linkId)}
                    />
                  ) : null}
                </ActionPanel.Section>
                <ActionPanel.Section title="Filters">
                  {workspaceId ? (
                    <Action.Push
                      title="Filter & Sort…"
                      icon={Icon.Filter}
                      shortcut={{ modifiers: ["cmd"], key: "f" }}
                      target={
                        <FiltersScreen
                          workspaceId={workspaceId}
                          value={filters}
                          currentMemberId={currentMemberId}
                          onChange={setFilters}
                        />
                      }
                    />
                  ) : null}
                  {isFiltered(filters) ? (
                    <Action
                      title="Clear Filters"
                      icon={Icon.XMarkCircle}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                      onAction={clearFilters}
                    />
                  ) : null}
                </ActionPanel.Section>
                <ActionPanel.Section title="Sort">
                  <Action title="Newest First" icon={Icon.ArrowDown} onAction={() => setSort("created_at", "desc")} />
                  <Action title="Oldest First" icon={Icon.ArrowUp} onAction={() => setSort("created_at", "asc")} />
                  <Action title="Title Ascending" icon={Icon.Text} onAction={() => setSort("link_title", "asc")} />
                  <Action title="Title Descending" icon={Icon.Text} onAction={() => setSort("link_title", "desc")} />
                </ActionPanel.Section>
                {workspaceList.length > 1 ? (
                  <ActionPanel.Submenu title="Switch Workspace" icon={Icon.AppWindow}>
                    {workspaceList.map((w) => (
                      <Action
                        key={w.workspaceId}
                        title={w.workspaceName}
                        onAction={() => setWorkspaceId(w.workspaceId)}
                      />
                    ))}
                  </ActionPanel.Submenu>
                ) : null}
                <Action.OpenInBrowser title="View All in Dashboard" icon={Icon.List} url={dashboardAllUrl} />
                <CommonActions workspaceId={workspaceId || undefined} currentWorkspaceMemberId={currentMemberId} />
              </ActionPanel>
            }
          />
        );
      })}
      {links.hasMore ? (
        <List.Item
          key="__view-all-dashboard"
          icon={{ source: Icon.ArrowNe, tintColor: Color.Blue }}
          title="View all in Dashboard"
          subtitle="Open the full links list"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="View All in Dashboard" icon={Icon.Globe} url={dashboardAllUrl} />
              <CommonActions workspaceId={workspaceId || undefined} currentWorkspaceMemberId={currentMemberId} />
            </ActionPanel>
          }
        />
      ) : null}
    </List>
  );
}
