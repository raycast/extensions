import { Action, ActionPanel, Color, Icon, Image, Keyboard, List } from "@raycast/api";
import { Project } from "../gitlabapi";
import { ReactNode } from "react";
import { PipelineList } from "./pipelines";
import { BranchList } from "./branch";
import { MilestoneList } from "./milestones";
import { MRList, MRScope } from "./mr";
import { IssueList, IssueScope } from "./issues";
import { GitLabIcons } from "../icons";
import { GitLabOpenInBrowserAction } from "./actions";
import { ProjectLabelList } from "./project_label";
import { ProjectCommitList } from "./commits/list";
import { getGitLabGQL } from "../common";

export function ProjectNavMenuItem(props: {
  title: string;
  shortcut?: Keyboard.Shortcut | undefined;
  target: ReactNode;
  icon?: Image.ImageLike;
  url?: string;
}) {
  return (
    <List.Item
      title={props.title}
      icon={props.icon}
      actions={
        <ActionPanel>
          <Action.Push
            title="Open Menu"
            shortcut={props.shortcut}
            icon={{ source: Icon.AppWindowList, tintColor: Color.PrimaryText }}
            target={props.target}
          />
          {props.url && <GitLabOpenInBrowserAction url={props.url} shortcut={props.shortcut} />}
        </ActionPanel>
      }
    />
  );
}

export function ProjectNavMenuBrowserItem(props: {
  title: string;
  shortcut?: Keyboard.Shortcut | undefined;
  url: string;
  icon?: Image.ImageLike;
}) {
  return (
    <List.Item
      title={props.title}
      icon={props.icon}
      actions={
        <ActionPanel>
          <GitLabOpenInBrowserAction url={props.url} shortcut={props.shortcut} />
        </ActionPanel>
      }
    />
  );
}

function webUrl(project: Project, partial: string) {
  return getGitLabGQL().urlJoin(`${project.fullPath}/${partial}`);
}

export function ProjectNavMenusList(props: { project: Project }) {
  const project = props.project;
  return (
    <List navigationTitle={`${project.name_with_namespace}`}>
      <ProjectNavMenuItem
        title="Issues"
        url={webUrl(project, "-/issues")}
        icon={{ source: GitLabIcons.issue, tintColor: Color.PrimaryText }}
        target={<IssueList scope={IssueScope.all} project={project} />}
      />
      <ProjectNavMenuItem
        title="Merge Requests"
        url={webUrl(project, "-/merge_requests")}
        icon={{ source: GitLabIcons.merge_request, tintColor: Color.PrimaryText }}
        target={<MRList scope={MRScope.all} project={project} />}
      />
      <ProjectNavMenuItem
        title="Branches"
        url={webUrl(project, "-/branches")}
        icon={{ source: GitLabIcons.branches, tintColor: Color.PrimaryText }}
        target={<BranchList project={project} navigationTitle={project.name_with_namespace} />}
      />
      <ProjectNavMenuItem
        title="Commits"
        url={webUrl(project, "-/commits")}
        icon={{ source: GitLabIcons.commit, tintColor: Color.PrimaryText }}
        target={<ProjectCommitList projectID={project.id} navigationTitle={project.name_with_namespace} />}
      />
      <ProjectNavMenuItem
        title="Pipelines"
        url={webUrl(project, "-/pipelines")}
        icon={{ source: GitLabIcons.ci, tintColor: Color.PrimaryText }}
        target={<PipelineList projectFullPath={project.fullPath} navigationTitle={project.name_with_namespace} />}
      />
      <ProjectNavMenuItem
        title="Milestones"
        icon={{ source: GitLabIcons.milestone, tintColor: Color.PrimaryText }}
        target={<MilestoneList project={project} navigationTitle={project.name_with_namespace} />}
      />
      <ProjectNavMenuBrowserItem
        title="Wiki"
        icon={{ source: GitLabIcons.wiki, tintColor: Color.PrimaryText }}
        url={webUrl(project, "-/wikis")}
      />
      <ProjectNavMenuItem
        title="Labels"
        icon={{ source: GitLabIcons.labels, tintColor: Color.PrimaryText }}
        target={<ProjectLabelList project={project} navigationTitle={project.name_with_namespace} />}
      />
      <ProjectNavMenuBrowserItem
        title="Security & Compliance"
        icon={{ source: GitLabIcons.security, tintColor: Color.PrimaryText }}
        url={webUrl(project, "-/security/discover")}
      />
      <ProjectNavMenuBrowserItem
        title="Settings"
        icon={{ source: GitLabIcons.settings, tintColor: Color.PrimaryText }}
        url={webUrl(project, "edit")}
      />
    </List>
  );
}
