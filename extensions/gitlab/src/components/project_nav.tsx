import { ActionPanel, Color, ImageLike, KeyboardShortcut, List, OpenInBrowserAction, PushAction } from "@raycast/api";
import { Project } from "../gitlabapi";
import { gitlabgql } from "../common";
import { ReactNode } from "react";
import { PipelineList } from "./pipelines";
import { BranchList } from "./branch";
import { MilestoneList } from "./milestones";
import { MRList, MRScope } from "./mr";
import { IssueList, IssueScope } from "./issues";
import { GitLabIcons } from "../icons";

export function ProjectNavMenuItem(props: {
  title: string;
  shortcut?: KeyboardShortcut | undefined;
  project: Project;
  target: ReactNode;
  icon?: ImageLike;
}) {
  return (
    <List.Item
      title={props.title}
      icon={props.icon}
      actions={
        <ActionPanel>
          <PushAction title="Open Menu" shortcut={props.shortcut} target={props.target} />
        </ActionPanel>
      }
    />
  );
}

export function ProjectNavMenuBrowserItem(props: {
  title: string;
  shortcut?: KeyboardShortcut | undefined;
  url: string;
  icon?: ImageLike;
}) {
  return (
    <List.Item
      title={props.title}
      icon={props.icon}
      actions={
        <ActionPanel>
          <OpenInBrowserAction url={props.url} shortcut={props.shortcut} />
        </ActionPanel>
      }
    />
  );
}

function webUrl(project: Project, partial: string) {
  return gitlabgql.urlJoin(`${project.fullPath}/${partial}`);
}

export function ProjectNavMenusList(props: { project: Project }) {
  return (
    <List navigationTitle="Project Menus">
      <ProjectNavMenuItem
        title="Issues"
        project={props.project}
        icon={{ source: GitLabIcons.issue, tintColor: Color.PrimaryText }}
        target={<IssueList scope={IssueScope.all} project={props.project} />}
      />
      <ProjectNavMenuItem
        title="Merge Requests"
        project={props.project}
        icon={{ source: GitLabIcons.merge_request, tintColor: Color.PrimaryText }}
        target={<MRList scope={MRScope.all} project={props.project} />}
      />
      <ProjectNavMenuItem
        title="Branches"
        project={props.project}
        icon={{ source: GitLabIcons.branches, tintColor: Color.PrimaryText }}
        target={<BranchList project={props.project} />}
      />
      <ProjectNavMenuItem
        title="Pipelines"
        project={props.project}
        icon={{ source: GitLabIcons.ci, tintColor: Color.PrimaryText }}
        target={<PipelineList projectFullPath={props.project.fullPath} />}
      />
      <ProjectNavMenuItem
        title="Milestones"
        project={props.project}
        icon={{ source: GitLabIcons.milestone, tintColor: Color.PrimaryText }}
        target={<MilestoneList project={props.project} />}
      />
      <ProjectNavMenuBrowserItem
        title="Labels"
        icon={{ source: GitLabIcons.labels, tintColor: Color.PrimaryText }}
        url={webUrl(props.project, "-/labels")}
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
