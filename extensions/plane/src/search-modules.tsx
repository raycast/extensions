import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import { useState } from "react";
import AuthorizedView from "./components/AuthorizedView";
import ErrorEmptyView from "./components/ErrorEmptyView";
import ProjectDropdown from "./components/ProjectDropdown";
import ChangeWorkspaceAction from "./components/actions/ChangeWorkspaceAction";
import { ModuleWorkItemsList } from "./components/CycleWorkItemsList";
import { useMemberProjects } from "./hooks/useProjects";
import { useModules } from "./hooks/useModules";
import { formatCycleProgress, getCycleProgress } from "./helpers/cycles";
import { getModuleUrl } from "./helpers/work-items";
import { capitalizeString } from "./helpers/strings";
import { planeClient } from "./api/auth";

function SearchModules() {
  const {
    projects,
    isLoading: isLoadingProjects,
    error: projectsError,
    revalidate: revalidateProjects,
  } = useMemberProjects({ showsErrorInline: true });
  const moduleProjects = projects.filter((project) => project.moduleView !== false);
  const [projectId, setProjectId] = useState("");
  const project = moduleProjects.find((item) => item.id === projectId) ?? moduleProjects[0];
  const { modules, isLoading, error, pagination, mutate } = useModules(project?.id ?? "", {
    execute: !!project?.id,
    showsErrorInline: true,
  });
  const slug = planeClient?.workspaceSlug ?? "";
  const listError = projectsError ?? error;

  return (
    <List
      isLoading={isLoadingProjects || isLoading}
      pagination={pagination}
      searchBarPlaceholder="Filter modules"
      searchBarAccessory={<ProjectDropdown projects={moduleProjects} onChange={setProjectId} />}
    >
      {listError && modules.length === 0 ? (
        <ErrorEmptyView
          error={listError}
          onRetry={() => {
            revalidateProjects();
            mutate();
          }}
        />
      ) : (
        <List.EmptyView
          icon={Icon.Box}
          title={project ? "No modules in this project" : "No projects with modules"}
          description={project ? undefined : "Enable Modules in a project's settings to use them here."}
        />
      )}
      {project
        ? modules.map((module) => {
            const counts = {
              total_issues: module.totalIssues,
              completed_issues: module.completedIssues,
              cancelled_issues: module.cancelledIssues,
            };
            const progress = getCycleProgress(counts);
            const url = getModuleUrl(slug, project.id as string, module.id as string);
            return (
              <List.Item
                key={module.id}
                icon={getProgressIcon(progress.percent / 100)}
                title={module.name}
                subtitle={module.status ? capitalizeString(module.status.toString()) : undefined}
                accessories={[{ text: formatCycleProgress(counts) }]}
                actions={
                  <ActionPanel title={module.name}>
                    <Action.Push
                      title="Open Module Work Items"
                      icon={Icon.List}
                      target={
                        <ModuleWorkItemsList
                          project={{ id: project.id as string, identifier: project.identifier, name: project.name }}
                          moduleId={module.id as string}
                          moduleName={module.name}
                        />
                      }
                    />
                    <Action.OpenInBrowser url={url} />
                    <Action.CopyToClipboard
                      title="Copy URL"
                      content={url}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
                    <ChangeWorkspaceAction />
                  </ActionPanel>
                }
              />
            );
          })
        : null}
    </List>
  );
}

export default function Command() {
  return (
    <AuthorizedView>
      <SearchModules />
    </AuthorizedView>
  );
}
