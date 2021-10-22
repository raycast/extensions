import {
  ActionPanel,
  CopyToClipboardAction,
  List,
  OpenInBrowserAction,
  showToast,
  ToastStyle,
  PushAction,
  Color,
} from "@raycast/api";
import { useState } from "react";
import { gitlab, gitlabgql } from "../common";
import { Project, searchData } from "../gitlabapi";
import { hashRecord, projectIconUrl } from "../utils";
import { PipelineList } from "./pipelines";
import { BranchList } from "./branch";
import { MilestoneList } from "./milestones";
import { MRList, MRScope } from "./mr";
import { IssueList, IssueScope } from "./issues";
import { CloneProjectInGitPod, CloneProjectInVSCodeAction, ShowProjectLabels } from "./project_actions";
import { GitLabIcons, useImage } from "../icons";
import { useCache } from "../cache";
import { ClearLocalCacheAction } from "./cache_actions";

function webUrl(project: Project, partial: string) {
  return gitlabgql.urlJoin(`${project.fullPath}/${partial}`);
}

export function ProjectListItem(props: { project: Project }) {
  const project = props.project;
  const {
    localFilepath: localImageFilepath,
    error,
    isLoading,
  } = useImage(projectIconUrl(project), GitLabIcons.project);

  return (
    <List.Item
      id={project.id.toString()}
      title={project.name_with_namespace}
      subtitle={"Stars " + project.star_count}
      icon={localImageFilepath}
      actions={
        <ActionPanel>
          <ActionPanel.Section title={project.name_with_namespace}>
            <OpenInBrowserAction url={project.web_url} />
            <CopyToClipboardAction title="Copy Project ID" content={project.id} />
            <PushAction
              title="Issues"
              shortcut={{ modifiers: ["cmd"], key: "i" }}
              icon={{ source: GitLabIcons.issue, tintColor: Color.PrimaryText }}
              target={<IssueList scope={IssueScope.all} project={project} />}
            />
            <PushAction
              title="Merge Requests"
              shortcut={{ modifiers: ["cmd"], key: "m" }}
              icon={{ source: GitLabIcons.merge_request, tintColor: Color.PrimaryText }}
              target={<MRList scope={MRScope.all} project={project} />}
            />
            <PushAction
              title="Branches"
              shortcut={{ modifiers: ["cmd"], key: "b" }}
              icon={{ source: GitLabIcons.branches, tintColor: Color.PrimaryText }}
              target={<BranchList project={project} />}
            />
            <PushAction
              title="Pipelines"
              shortcut={{ modifiers: ["cmd"], key: "p" }}
              icon={{ source: GitLabIcons.ci, tintColor: Color.PrimaryText }}
              target={<PipelineList projectFullPath={project.fullPath} />}
            />
            <PushAction
              title="Milestones"
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              icon={{ source: GitLabIcons.milestone, tintColor: Color.PrimaryText }}
              target={<MilestoneList project={project} />}
            />
            <ShowProjectLabels project={props.project} shortcut={{ modifiers: ["cmd"], key: "l" }} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Open in Browser">
            <OpenInBrowserAction
              title="Labels"
              icon={{ source: GitLabIcons.labels, tintColor: Color.PrimaryText }}
              url={webUrl(props.project, "-/labels")}
            />
            <OpenInBrowserAction
              title="Security & Compliance"
              icon={{ source: GitLabIcons.security, tintColor: Color.PrimaryText }}
              url={webUrl(props.project, "-/security/discover")}
            />
            <OpenInBrowserAction
              title="Settings"
              icon={{ source: GitLabIcons.settings, tintColor: Color.PrimaryText }}
              url={webUrl(props.project, "edit")}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="IDE">
            <CloneProjectInVSCodeAction shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} project={project} />
            <CloneProjectInGitPod shortcut={{ modifiers: ["cmd", "shift"], key: "g" }} project={project} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Cache">
            <ClearLocalCacheAction />
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
        return await searchData<Project[]>(projects, {
          search: searchText || "",
          keys: ["name_with_namespace"],
          limit: 50,
        });
      },
    }
  );

  if (error) {
    showToast(ToastStyle.Failure, "Cannot search Project", error);
  }

  if (!data) {
    return <List isLoading={true} searchBarPlaceholder="Loading" />;
  }

  return (
    <List
      searchBarPlaceholder="Filter Projects by name..."
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      throttle={true}
    >
      {data?.map((project) => (
        <ProjectListItem key={project.id} project={project} />
      ))}
    </List>
  );
}
