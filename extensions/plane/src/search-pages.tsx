import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useState } from "react";
import AuthorizedView from "./components/AuthorizedView";
import ErrorEmptyView from "./components/ErrorEmptyView";
import ProjectDropdown from "./components/ProjectDropdown";
import ChangeWorkspaceAction from "./components/actions/ChangeWorkspaceAction";
import { useMemberProjects } from "./hooks/useProjects";
import { usePages } from "./hooks/usePages";
import { getErrorStatus } from "./helpers/errors";
import { getPagesUrl, getPageUrl } from "./helpers/work-items";
import { parseHtmlToMarkdown } from "./helpers/parser";
import { rowsFromProject } from "./helpers/project-scoped";
import { planeClient } from "./api/auth";

function SearchPages() {
  const { projects, isLoading: isLoadingProjects } = useMemberProjects();
  const [projectId, setProjectId] = useState<string | undefined>(undefined);
  const { data, isLoading, error, revalidate } = usePages(projectId, { execute: projectId !== undefined });
  // Pages of the previously selected project stay in `data` while this one loads; never show them under it.
  const pages = rowsFromProject(data, projectId);
  const slug = planeClient?.workspaceSlug ?? "";
  const notAvailable = getErrorStatus(error) === 404;

  return (
    <List
      isLoading={isLoadingProjects || isLoading}
      isShowingDetail={pages.length > 0}
      searchBarPlaceholder="Filter pages"
      searchBarAccessory={
        <ProjectDropdown
          projects={projects.filter((project) => project.pageView !== false)}
          onChange={setProjectId}
          allItemTitle="Workspace Pages"
        />
      }
    >
      {notAvailable ? (
        <List.EmptyView
          icon={Icon.Document}
          title="Pages aren't available through the API on Plane Community Edition"
          description="The public pages API exists on Plane Cloud and Commercial editions. Open Plane in the browser to browse pages."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Pages in Browser" url={getPagesUrl(slug, projectId || undefined)} />
              <ChangeWorkspaceAction />
            </ActionPanel>
          }
        />
      ) : error && pages.length === 0 ? (
        <ErrorEmptyView error={error} onRetry={revalidate} />
      ) : (
        <List.EmptyView icon={Icon.Document} title="No pages found" />
      )}
      {pages.map((page) => {
        const url = getPageUrl(slug, page.id, projectId || undefined);
        const markdown = page.description_html
          ? parseHtmlToMarkdown(page.description_html)
          : (page.description_stripped ?? "_No preview available._");
        return (
          <List.Item
            key={page.id}
            icon={page.is_locked ? Icon.Lock : Icon.Document}
            title={page.name || "Untitled"}
            accessories={page.updated_at ? [{ date: new Date(page.updated_at), tooltip: "Updated" }] : []}
            detail={<List.Item.Detail markdown={`# ${page.name || "Untitled"}\n\n${markdown}`} />}
            actions={
              <ActionPanel title={page.name || "Untitled"}>
                <Action.OpenInBrowser url={url} />
                <Action.CopyToClipboard
                  title="Copy URL"
                  content={url}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
                <Action.CopyToClipboard
                  title="Copy Markdown Link"
                  content={`[${page.name || "Untitled"}](${url})`}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={revalidate}
                />
                <ChangeWorkspaceAction />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

export default function Command() {
  return (
    <AuthorizedView>
      <SearchPages />
    </AuthorizedView>
  );
}
