import { ActionPanel, Color, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { gitlab } from "../common";
import { Project } from "../gitlabapi";
import { getErrorMessage, projectIcon, showErrorToast } from "../utils";
import {
  CloneProjectInGitPod,
  CloneProjectInVSCodeAction,
  CopyProjectIDToClipboardAction,
  CopyCloneUrlToClipboardAction,
  CreateNewProjectIssuePushAction,
  OpenProjectBranchesPushAction,
  OpenProjectIssuesPushAction,
  OpenProjectLabelsInBrowserAction,
  OpenProjectMergeRequestsPushAction,
  OpenProjectMilestonesPushAction,
  OpenProjectPipelinesPushAction,
  OpenProjectSecurityComplianceInBrowserAction,
  OpenProjectSettingsInBrowserAction,
  OpenProjectWikiInBrowserAction,
  ProjectDefaultActions,
  ShowProjectLabels,
} from "./project_actions";
import { CacheActionPanelSection } from "./cache_actions";
import { ProjectListEmptyView } from "./project";

export function ProjectListItem(props: { project: Project }): JSX.Element {
  const project = props.project;
  const accessories = [];
  if (project.archived) {
    accessories.push({ tooltip: "Archived", icon: { source: Icon.ExclamationMark, tintColor: Color.Yellow } });
  }
  accessories.push({
    text: project.star_count.toString(),
    icon: {
      source: Icon.Star,
      tintColor: project.star_count > 0 ? Color.Yellow : null,
    },
    tooltip: `Number of stars: ${project.star_count}`,
  });
  return (
    <List.Item
      id={project.id.toString()}
      title={project.name_with_namespace}
      accessories={accessories}
      icon={projectIcon(project)}
      actions={
        <ActionPanel>
          <ActionPanel.Section title={project.name_with_namespace}>
            <ProjectDefaultActions project={project} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <CopyProjectIDToClipboardAction project={project} />
            <CopyCloneUrlToClipboardAction shortcut={{ modifiers: ["cmd"], key: "u" }} project={project} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <OpenProjectIssuesPushAction project={project} />
            <OpenProjectMergeRequestsPushAction project={project} />
            <OpenProjectBranchesPushAction project={project} />
            <OpenProjectPipelinesPushAction project={project} />
            <OpenProjectMilestonesPushAction project={project} />
            <OpenProjectWikiInBrowserAction project={project} />
            <ShowProjectLabels project={props.project} shortcut={{ modifiers: ["cmd"], key: "l" }} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Open in Browser">
            <CreateNewProjectIssuePushAction project={project} />
            <OpenProjectLabelsInBrowserAction project={project} />
            <OpenProjectSecurityComplianceInBrowserAction project={project} />
            <OpenProjectSettingsInBrowserAction project={project} />
          </ActionPanel.Section>
          <ActionPanel.Section title="IDE">
            <CloneProjectInVSCodeAction shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} project={project} />
            <CloneProjectInGitPod shortcut={{ modifiers: ["cmd", "shift"], key: "g" }} project={project} />
          </ActionPanel.Section>
          <CacheActionPanelSection />
        </ActionPanel>
      }
    />
  );
}

export function ProjectSearchList(): JSX.Element {
  const [searchText, setSearchText] = useState<string>();
  const { projects, error, isLoading } = useSearch(searchText);

  if (error) {
    showErrorToast(error, "Cannot search Project");
  }

  return (
    <List
      searchBarPlaceholder="Filter Projects by Name..."
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      throttle={true}
    >
      <List.Section title="Projects" subtitle={`${projects?.length}`}>
        {projects?.map((project) => (
          <ProjectListItem key={project.id} project={project} />
        ))}
      </List.Section>
      <ProjectListEmptyView />
    </List>
  );
}

export function useSearch(query: string | undefined): {
  projects?: Project[];
  error?: string;
  isLoading: boolean;
} {
  const [projects, setProjects] = useState<Project[]>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // FIXME In the future version, we don't need didUnmount checking
    // https://github.com/facebook/react/pull/22114
    let didUnmount = false;

    async function fetchData() {
      if (query === null || didUnmount) {
        return;
      }

      setIsLoading(true);
      setError(undefined);

      try {
        const glProjects = await gitlab.getProjects({ searchText: query || "", searchIn: "title" });

        if (!didUnmount) {
          setProjects(glProjects);
        }
      } catch (e) {
        if (!didUnmount) {
          setError(getErrorMessage(e));
        }
      } finally {
        if (!didUnmount) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      didUnmount = true;
    };
  }, [query]);

  return { projects, error, isLoading };
}
