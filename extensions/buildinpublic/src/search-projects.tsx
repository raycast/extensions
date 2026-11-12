import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { searchProjects } from "./api";
import { DirectoryEmptyView, isExpected } from "./components/DirectoryEmptyView";
import { ProjectCopyActions, ProjectListItem, ProjectOpenActions } from "./components/ProjectListItem";
import { SITE_URL } from "./oauth";

export default function Command() {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("new");

  const {
    data: projects,
    isLoading,
    error,
    pagination,
    revalidate,
  } = useCachedPromise(
    (q: string, sort: string) =>
      async ({ cursor }: { cursor?: string }) => {
        const page = await searchProjects({ q, sort, cursor });
        return { data: page.data, hasMore: page.has_more, cursor: page.next_cursor ?? undefined };
      },
    [query, sort],
    { keepPreviousData: true, onError: (error) => (isExpected(error) ? undefined : console.error(error)) },
  );

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      throttle
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search projects by name, pitch or URL…"
      searchBarAccessory={
        <List.Dropdown tooltip="Sort" storeValue onChange={setSort}>
          <List.Dropdown.Item title="Newest" value="new" />
          <List.Dropdown.Item title="Most Popular" value="popular" />
        </List.Dropdown>
      }
    >
      {error || !projects?.length ? (
        isLoading && !error ? null : (
          <DirectoryEmptyView error={error} noun="projects" onRetry={revalidate} />
        )
      ) : (
        projects.map((project) => (
          <ProjectListItem
            key={project.id}
            project={project}
            showOwner
            actions={
              <ActionPanel>
                <ProjectOpenActions project={project} />
                <Action.OpenInBrowser
                  title="Open Maker Profile"
                  icon={Icon.Person}
                  url={`${SITE_URL}/x/${project.owner.username}`}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                />
                <ProjectCopyActions project={project} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
