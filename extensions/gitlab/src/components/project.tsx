import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { gitlab } from "../common";
import { Project, searchData } from "../gitlabapi";
import { getFirstChar, projectIconUrl } from "../utils";
import {
  CloneProjectInGitPod,
  CloneProjectInVSCodeAction,
  CopyCloneUrlToClipboardAction,
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
  CreateNewProjectIssuePushAction,
  CreateProjectQuickLinkAction,
  ShowProjectReadmeAction,
} from "./project_actions";
import { GitLabIcons, getTextIcon } from "../icons";

export enum ProjectScope {
  membership = "membership",
  all = "all",
}

export function ProjectListItem(props: { project: Project; nameOnly?: boolean; showCreateQuickLink?: boolean }) {
  const accessories = [];
  if (props.project.archived) {
    accessories.push({ tooltip: "Archived", icon: { source: Icon.ExclamationMark, tintColor: Color.Yellow } });
  }
  accessories.push({
    text: props.project.star_count.toString(),
    icon: {
      source: Icon.Star,
      tintColor: props.project.star_count > 0 ? Color.Yellow : null,
    },
    tooltip: `Number of stars: ${props.project.star_count}`,
  });
  return (
    <List.Item
      title={props.nameOnly === true ? props.project.name : props.project.name_with_namespace}
      accessories={accessories}
      icon={
        projectIconUrl(props.project)
          ? { source: projectIconUrl(props.project)! }
          : getTextIcon((props.project.name ? getFirstChar(props.project.name) : "?").toUpperCase())
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title={props.project.name_with_namespace}>
            <ProjectDefaultActions project={props.project} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Project ID" content={props.project.id} />
            <Action.CopyToClipboard title="Copy Project URL" content={props.project.web_url} />
            <CopyCloneUrlToClipboardAction shortcut={{ modifiers: ["cmd"], key: "u" }} project={props.project} />
            {props.showCreateQuickLink && <CreateProjectQuickLinkAction project={props.project} />}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <ShowProjectReadmeAction project={props.project} />
            <OpenProjectIssuesPushAction project={props.project} />
            <OpenProjectMergeRequestsPushAction project={props.project} />
            <OpenProjectBranchesPushAction project={props.project} />
            <OpenProjectPipelinesPushAction project={props.project} />
            <OpenProjectMilestonesPushAction project={props.project} />
            <OpenProjectWikiInBrowserAction project={props.project} />
            <ShowProjectLabels project={props.project} shortcut={{ modifiers: ["cmd"], key: "l" }} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Open in Browser">
            <CreateNewProjectIssuePushAction project={props.project} />
            <OpenProjectLabelsInBrowserAction project={props.project} />
            <OpenProjectSecurityComplianceInBrowserAction project={props.project} />
            <OpenProjectSettingsInBrowserAction project={props.project} />
          </ActionPanel.Section>
          <ActionPanel.Section title="IDE">
            <CloneProjectInVSCodeAction shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} project={props.project} />
            <CloneProjectInGitPod shortcut={{ modifiers: ["cmd", "shift"], key: "g" }} project={props.project} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

interface ProjectListProps {
  membership?: boolean;
  starred?: boolean;
}

export function ProjectListEmptyView() {
  return <List.EmptyView title="No Projects" icon={{ source: GitLabIcons.project, tintColor: Color.PrimaryText }} />;
}

export function ProjectList({ membership = true, starred = false }: ProjectListProps) {
  const [searchText, setSearchText] = useState<string>();
  const { data, isLoading } = useCachedPromise(
    async (isStarred: boolean, isMembership: boolean): Promise<Project[]> => {
      if (isStarred) {
        return gitlab.getStarredProjects({ searchText: "", searchIn: "name" }, true);
      }
      if (isMembership) {
        return gitlab.getUserProjects({ search: "" }, true);
      }
      return [];
    },
    [starred, membership],
    { initialData: [] },
  );

  const projects: Project[] = searchData<Project[]>(data, {
    search: searchText || "",
    keys: ["name_with_namespace"],
    limit: 50,
  });

  return (
    <List
      searchBarPlaceholder="Filter Projects by Name..."
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      throttle={true}
    >
      <List.Section
        title={searchText && searchText.length > 0 ? "Search Results" : "Projects"}
        subtitle={`${projects.length}`}
      >
        {projects.map((project) => (
          <ProjectListItem key={project.id} project={project} showCreateQuickLink={membership && !starred} />
        ))}
      </List.Section>
      <ProjectListEmptyView />
    </List>
  );
}

export function useMyProjects(): {
  projects: Project[];
  isLoading?: boolean;
} {
  const { data, isLoading } = useCachedPromise(() => gitlab.getUserProjects({ search: "" }, true), [], {
    initialData: [],
  });
  return {
    projects: data,
    isLoading,
  };
}

export function MyProjectsDropdown(props: {
  onChange: (project: Project | undefined) => void;
  projects?: Project[];
  value?: string;
  storeValue?: boolean;
  includeAllItem?: boolean;
}): React.ReactNode {
  const { projects: hookProjects } = useMyProjects();
  const myprojects = props.projects ?? hookProjects;
  const includeAllItem = props.includeAllItem !== false;
  return (
    <List.Dropdown
      tooltip="Select Project"
      value={props.value}
      storeValue={props.storeValue}
      onChange={(newValue) => {
        if (includeAllItem && newValue === "-") {
          props.onChange(undefined);
          return;
        }
        const selectedProject = myprojects.find((project) => `${project.id}` === newValue);
        props.onChange(selectedProject);
      }}
    >
      {includeAllItem && (
        <List.Dropdown.Section>
          <List.Dropdown.Item title="All Projects" value="-" />
        </List.Dropdown.Section>
      )}
      <List.Dropdown.Section>
        {myprojects.map((project) => (
          <List.Dropdown.Item
            key={`${project.id}`}
            title={project.name_with_namespace}
            icon={
              projectIconUrl(project)
                ? { source: projectIconUrl(project)! }
                : getTextIcon((project.name ? getFirstChar(project.name) : "?").toUpperCase())
            }
            value={`${project.id}`}
          />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
