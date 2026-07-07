import { ActionPanel, Color, Icon, Image, List, getPreferenceValues } from "@raycast/api";
import { useRef, useState } from "react";
import { gitlab } from "../common";
import { Project } from "../gitlabapi";
import { daysInSeconds, getFirstChar, hashRecord, projectIconUrl, showErrorToast } from "../utils";
import {
  CloneProjectInGitPod,
  CloneProjectInVSCodeAction,
  CopyProjectIDToClipboardAction,
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
  CopyProjectUrlToClipboardAction,
  CreateNewProjectIssuePushAction,
  ShowProjectReadmeAction,
} from "./project_actions";
import { GitLabIcons, getTextIcon, useImage } from "../icons";
import { useCache } from "../cache";
import { CacheActionPanelSection } from "./cache_actions";

export enum ProjectScope {
  membership = "membership",
  all = "all",
}

function getProjectTextIcon(project: Project): Image.ImageLike | undefined {
  return getTextIcon((project.name ? getFirstChar(project.name) : "?").toUpperCase());
}

export function ProjectListItem(props: { project: Project; nameOnly?: boolean }) {
  const project = props.project;
  const { localFilepath: localImageFilepath } = useImage(projectIconUrl(project));
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
      title={props.nameOnly === true ? project.name : project.name_with_namespace}
      accessories={accessories}
      icon={localImageFilepath ? { source: localImageFilepath } : getProjectTextIcon(project)}
      actions={
        <ActionPanel>
          <ActionPanel.Section title={project.name_with_namespace}>
            <ProjectDefaultActions project={project} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <CopyProjectIDToClipboardAction project={project} />
            <CopyProjectUrlToClipboardAction project={project} />
            <CopyCloneUrlToClipboardAction shortcut={{ modifiers: ["cmd"], key: "u" }} project={project} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <ShowProjectReadmeAction project={project} />
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

interface ProjectListProps {
  membership?: boolean;
  starred?: boolean;
}

export function ProjectListEmptyView() {
  return <List.EmptyView title="No Projects" icon={{ source: GitLabIcons.project, tintColor: Color.PrimaryText }} />;
}

// Cap rendered List.Items to avoid OOM — each item creates ~18 action components in the ActionPanel
const MAX_RENDERED_PROJECTS = 100;

export function ProjectList({ membership = true, starred = false }: ProjectListProps) {
  const [searchText, setSearchText] = useState<string>();
  const activeOnly = (getPreferenceValues().active as boolean) || false;
  const totalCount = useRef(0);
  const { data, error, isLoading } = useCache<Project[]>(
    hashRecord({ membership: membership, starred: starred, active: activeOnly }, "projects"),
    async () => {
      const params: Record<string, string> = { search: "" };
      if (activeOnly) {
        params.archived = "false";
      }
      if (starred) {
        return await gitlab.getStarredProjects({ searchText: "", searchIn: "name" }, true);
      }
      if (membership) {
        return await gitlab.getUserProjects(params, true);
      }
      return [];
    },
    {
      deps: [searchText, membership, starred],
      // Substring match instead of Fuse.js — building a Fuse index on thousands of projects exceeds the worker memory limit
      onFilter: async (projects) => {
        totalCount.current = projects.length;
        if (!searchText || searchText.length === 0) return projects.slice(0, MAX_RENDERED_PROJECTS);
        const terms = searchText.toLowerCase().split(/\s+/);
        const filtered: Project[] = [];
        for (const p of projects) {
          const name = p.name_with_namespace.toLowerCase();
          if (terms.every((t) => name.includes(t))) {
            filtered.push(p);
            if (filtered.length >= MAX_RENDERED_PROJECTS) break;
          }
        }
        return filtered;
      },
      secondsToRefetch: daysInSeconds(1),
      secondsToInvalid: daysInSeconds(7),
    },
  );

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
      <List.Section
        title={searchText && searchText.length > 0 ? "Search Results" : "Recent Projects"}
        subtitle={
          data && totalCount.current > data.length ? `${data.length} of ${totalCount.current}` : `${data?.length ?? 0}`
        }
      >
        {data?.map((project) => (
          <ProjectListItem key={project.id} project={project} />
        ))}
      </List.Section>
      <ProjectListEmptyView />
    </List>
  );
}

export function useMyProjects(): { projects: Project[] | undefined; error?: string; isLoading?: boolean } {
  const membership = true;
  const starred = false;

  const {
    data: projects,
    error,
    isLoading,
  } = useCache<Project[]>(
    hashRecord({ membership: membership, starred: starred, active: false }, "projects"),
    async () => {
      return await gitlab.getUserProjects({ search: "" }, true);
    },
    {
      deps: [],
      secondsToInvalid: daysInSeconds(7),
    },
  );
  return { projects, error, isLoading };
}

function MyProjectsDropdownItem(props: { project: Project }) {
  const pro = props.project;
  const { localFilepath } = useImage(projectIconUrl(pro));
  return (
    <List.Dropdown.Item
      title={pro.name_with_namespace}
      icon={localFilepath ? { source: localFilepath } : getProjectTextIcon(pro)}
      value={`${pro.id}`}
    />
  );
}

export function MyProjectsDropdown(props: {
  onChange: (pro: Project | undefined) => void;
  storeValue?: boolean;
}): React.ReactNode | null {
  const { projects: myprojects } = useMyProjects();
  if (myprojects) {
    return (
      <List.Dropdown
        tooltip="Select Project"
        storeValue={props.storeValue}
        onChange={(newValue) => {
          const pro = myprojects.find((p) => `${p.id}` === newValue);
          props.onChange(pro);
        }}
      >
        <List.Dropdown.Section>
          <List.Dropdown.Item title="All Projects" value="-" />
        </List.Dropdown.Section>
        <List.Dropdown.Section>
          {myprojects.map((pro) => (
            <MyProjectsDropdownItem key={`${pro.id}`} project={pro} />
          ))}
        </List.Dropdown.Section>
      </List.Dropdown>
    );
  }
  return null;
}
