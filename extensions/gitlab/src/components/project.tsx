import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { useMemo, useState } from "react";
import { gitlab } from "../common";
import { Project, searchData } from "../gitlabapi";
import { getFirstChar, getPreferences, projectDropdownTitle, projectIconUrl } from "../utils";
import { useAvatars } from "../hooks";
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
  const avatarSources = useAvatars([projectIconUrl(props.project)]);
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
        avatarSources[projectIconUrl(props.project) ?? ""]
          ? { source: avatarSources[projectIconUrl(props.project) ?? ""] }
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

export function ProjectListEmptyView() {
  return <List.EmptyView title="No Projects" icon={{ source: GitLabIcons.project, tintColor: Color.PrimaryText }} />;
}

export function ProjectList() {
  const [searchText, setSearchText] = useState<string>();
  const { data, isLoading } = useCachedPromise(
    () => gitlab.getStarredProjects({ searchText: "", searchIn: "name" }, true),
    [],
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
          <ProjectListItem key={project.id} project={project} />
        ))}
      </List.Section>
      <ProjectListEmptyView />
    </List>
  );
}

export function useMyProjects(execute = true): {
  projects: Project[];
  isLoading?: boolean;
} {
  const { data, isLoading } = useCachedPromise(() => gitlab.getUserProjects({ simple: "true" }, true), [], {
    initialData: [],
    execute,
  });
  return {
    projects: data,
    isLoading,
  };
}

const RECENT_PROJECTS_COUNT = 3;

function MyProjectsDropdownItem(props: { project: Project; avatarSource?: string }) {
  return (
    <List.Dropdown.Item
      title={projectDropdownTitle(props.project)}
      icon={
        props.avatarSource
          ? { source: props.avatarSource }
          : getTextIcon((props.project.name ? getFirstChar(props.project.name) : "?").toUpperCase())
      }
      value={`${props.project.id}`}
    />
  );
}

export function MyProjectsDropdown(props: {
  onChange: (project: Project | undefined) => void;
  value?: string;
  storeValue?: boolean;
  includeAllItem?: boolean;
}): React.ReactNode {
  const { projects: myprojects, isLoading } = useMyProjects();
  const avatarSources = useAvatars(myprojects.map(projectIconUrl));
  const [recentProjectIds, setRecentProjectIds] = useCachedState<number[]>("my-projects-dropdown-recent", []);
  const includeAllItem = props.includeAllItem !== false;

  // "Recent" shows the last selected projects (current one first); the remaining projects are grouped
  // by top-level group, or by the first subgroup when the top-level group is hidden from titles.
  const { recentProjects, groupSections } = useMemo(() => {
    const currentProjectId = props.value && props.value !== "-" ? [Number(props.value)] : [];
    const recentProjects = [...new Set([...currentProjectId, ...recentProjectIds])]
      .map((id) => myprojects.find((project) => project.id === id))
      .filter((project): project is Project => !!project)
      .slice(0, RECENT_PROJECTS_COUNT);
    const showRepositoryGroupName = getPreferences().showRepositoryGroupName;
    const groups = new Map<string, Project[]>();
    for (const project of myprojects) {
      if (recentProjects.includes(project)) {
        continue;
      }
      const namespaces = project.name_with_namespace.split(" / ").slice(0, -1);
      const group = (showRepositoryGroupName ? namespaces[0] : (namespaces[1] ?? namespaces[0])) ?? "";
      groups.set(group, [...(groups.get(group) ?? []), project]);
    }
    return {
      recentProjects,
      groupSections: [...groups].sort(([first], [second]) => first.localeCompare(second)),
    };
  }, [myprojects, props.value, recentProjectIds]);

  return (
    <List.Dropdown
      tooltip="Select Project"
      placeholder="Search Projects..."
      value={props.value}
      storeValue={props.storeValue}
      isLoading={isLoading}
      onChange={(newValue) => {
        if (includeAllItem && newValue === "-") {
          props.onChange(undefined);
          return;
        }
        const project = myprojects.find((project) => `${project.id}` === newValue);
        if (project) {
          setRecentProjectIds((current) =>
            [project.id, ...current.filter((id) => id !== project.id)].slice(0, RECENT_PROJECTS_COUNT),
          );
        }
        props.onChange(project);
      }}
    >
      {includeAllItem && (
        <List.Dropdown.Section>
          <List.Dropdown.Item title="All Projects" value="-" />
        </List.Dropdown.Section>
      )}
      {recentProjects.length > 0 && (
        <List.Dropdown.Section title="Recent">
          {recentProjects.map((project) => (
            <MyProjectsDropdownItem
              key={project.id}
              project={project}
              avatarSource={avatarSources[projectIconUrl(project) ?? ""]}
            />
          ))}
        </List.Dropdown.Section>
      )}
      {groupSections.map(([group, projects]) => (
        <List.Dropdown.Section key={group} title={group}>
          {projects.map((project) => (
            <MyProjectsDropdownItem
              key={project.id}
              project={project}
              avatarSource={avatarSources[projectIconUrl(project) ?? ""]}
            />
          ))}
        </List.Dropdown.Section>
      ))}
    </List.Dropdown>
  );
}
