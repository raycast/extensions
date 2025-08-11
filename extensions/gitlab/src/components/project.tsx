import { ActionPanel, Color, Icon, Image, List } from "@raycast/api";
import { useState } from "react";
import { gitlab } from "../common";
import { Project, searchData } from "../gitlabapi";
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

export function ProjectList({ membership = true, starred = false }: ProjectListProps) {
  const [searchText, setSearchText] = useState<string>();
  const { data, error, isLoading } = useCache<Project[]>(
    hashRecord({ membership: membership, starred: starred }, "projects"),
    async () => {
      let glProjects: Project[] = [];
      if (starred) {
        glProjects = await gitlab.getStarredProjects({ searchText: "", searchIn: "name" }, true);
      } else {
        if (membership) {
          glProjects = await gitlab.getUserProjects({ search: "" }, true);
        }
      }
      return glProjects;
    },
    {
      deps: [searchText, membership, starred],
      onFilter: async (projects) => {
        return searchData<Project[]>(projects, {
          search: searchText || "",
          keys: ["name_with_namespace"],
          limit: 50,
        });
      },
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
        title={searchText && searchText.length > 0 ? "Search Results" : "Projects"}
        subtitle={`${data?.length}`}
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
    hashRecord({ membership: membership, starred: starred }, "projects"),
    async () => {
      let glProjects: Project[] = [];
      if (starred) {
        glProjects = await gitlab.getStarredProjects({ searchText: "", searchIn: "name" }, true);
      } else {
        if (membership) {
          glProjects = await gitlab.getUserProjects({ search: "" }, true);
        }
      }
      return glProjects;
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

export function MyProjectsDropdown(props: { onChange: (pro: Project | undefined) => void }): React.ReactNode | null {
  const { projects: myprojects } = useMyProjects();
  if (myprojects) {
    return (
      <List.Dropdown
        tooltip="Select Project"
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
