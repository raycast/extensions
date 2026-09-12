import { Action, ActionPanel, Color, Icon, Image, Keyboard, List } from "@raycast/api";
import { Project } from "../gitlabapi";
import { ReactNode } from "react";
import { PipelineList } from "./pipelines";
import { BranchList } from "./branch";
import { MilestoneList } from "./milestones";
import { SearchMyMergeRequests } from "./mr_search";
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
  return (
    <List navigationTitle={`${props.project.name_with_namespace}`}>
      <ProjectNavMenuItem
        title="Issues"
        url={webUrl(props.project, "-/issues")}
        icon={{ source: GitLabIcons.issue, tintColor: Color.PrimaryText }}
        target={<IssueList scope={IssueScope.all} project={props.project} />}
      />
      <ProjectNavMenuItem
        title="Merge Requests"
        url={webUrl(props.project, "-/merge_requests")}
        icon={{ source: GitLabIcons.merge_request, tintColor: Color.PrimaryText }}
        target={<SearchMyMergeRequests project={props.project} />}
      />
      <ProjectNavMenuItem
        title="Branches"
        url={webUrl(props.project, "-/branches")}
        icon={{ source: GitLabIcons.branches, tintColor: Color.PrimaryText }}
        target={<BranchList project={props.project} navigationTitle={props.project.name_with_namespace} />}
      />
      <ProjectNavMenuItem
        title="Commits"
        url={webUrl(props.project, "-/commits")}
        icon={{ source: GitLabIcons.commit, tintColor: Color.PrimaryText }}
        target={<ProjectCommitList project={props.project} navigationTitle={props.project.name_with_namespace} />}
      />
      <ProjectNavMenuItem
        title="Pipelines"
        url={webUrl(props.project, "-/pipelines")}
        icon={{ source: GitLabIcons.ci, tintColor: Color.PrimaryText }}
        target={
          <PipelineList projectFullPath={props.project.fullPath} navigationTitle={props.project.name_with_namespace} />
        }
      />
      <ProjectNavMenuItem
        title="Milestones"
        icon={{ source: GitLabIcons.milestone, tintColor: Color.PrimaryText }}
        target={
          <MilestoneList project={props.project} navigationTitle={`Milestones ${props.project.name_with_namespace}`} />
        }
      />
      <ProjectNavMenuBrowserItem
        title="Wiki"
        icon={{ source: GitLabIcons.wiki, tintColor: Color.PrimaryText }}
        url={webUrl(props.project, "-/wikis")}
      />
      <ProjectNavMenuItem
        title="Labels"
        icon={{ source: GitLabIcons.labels, tintColor: Color.PrimaryText }}
        target={<ProjectLabelList project={props.project} navigationTitle={props.project.name_with_namespace} />}
      />
      <ProjectNavMenuBrowserItem
        title="Security & Compliance"
        icon={{ source: GitLabIcons.security, tintColor: Color.PrimaryText }}
        url={webUrl(props.project, "-/security/discover")}
      />
      <ProjectNavMenuBrowserItem
        title="Settings"
        icon={{ source: GitLabIcons.settings, tintColor: Color.PrimaryText }}
        url={webUrl(props.project, "edit")}
      />
    </List>
  );
}
