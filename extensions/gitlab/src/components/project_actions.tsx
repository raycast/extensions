import { Action, ActionPanel, closeMainWindow, Color, Icon, Keyboard, List, popToRoot } from "@raycast/api";
import * as open from "open";
import React from "react";
import { getGitLabGQL, getPrimaryActionPreference, PrimaryAction } from "../common";
import { Project } from "../gitlabapi";
import { GitLabIcons } from "../icons";
import { getErrorMessage, showErrorToast } from "../utils";
import { getVSCodeAppPath } from "../vscode";
import { GitLabOpenInBrowserAction } from "./actions";
import { BranchList } from "./branch";
import { IssueList, IssueScope } from "./issues";
import { MilestoneList } from "./milestones";
import { MRList, MRScope } from "./mr";
import { PipelineList } from "./pipelines";
import { ProjectLabelList } from "./project_label";
import { ProjectNavMenusList } from "./project_nav";

function CloneURLInVSCodeListItem(props: { url?: string }) {
  const clone = async (url: string) => {
    try {
      if (url && url.length > 0) {
        const urlencoded = encodeURIComponent(url);
        const vscodeurl = `vscode://vscode.git/clone?url=${urlencoded}`;
        console.log(vscodeurl);
        closeMainWindow();
        popToRoot();
        await open.default(vscodeurl);
      }
    } catch (e) {
      showErrorToast(getErrorMessage(e), "Could not clone in VSCode");
    }
  };
  if (props.url && props.url.length > 0) {
    return (
      <List.Item
        title={props.url}
        icon={{ fileIcon: getVSCodeAppPath() || "" }}
        actions={
          <ActionPanel>
            <Action title="Clone" onAction={() => clone(props.url || "")} />
          </ActionPanel>
        }
      />
    );
  } else {
    return null;
  }
}

function CloneInVSCodeList(props: { project: Project }): JSX.Element {
  return (
    <List navigationTitle="Clone in VSCode">
      <CloneURLInVSCodeListItem url={props.project.ssh_url_to_repo} />
      <CloneURLInVSCodeListItem url={props.project.http_url_to_repo} />
    </List>
  );
}

export function CloneProjectInVSCodeAction(props: {
  shortcut?: Keyboard.Shortcut;
  project: Project;
}): JSX.Element | null {
  const pro = props.project;
  const code = getVSCodeAppPath();
  if (code && (pro.http_url_to_repo || pro.ssh_url_to_repo)) {
    return (
      <Action.Push
        title="Clone in VSCode"
        icon={{ fileIcon: code }}
        shortcut={props.shortcut}
        target={<CloneInVSCodeList project={pro} />}
      />
    );
  } else {
    return null;
  }
}

export function CloneProjectInGitPod(props: { shortcut?: Keyboard.Shortcut; project: Project }): JSX.Element | null {
  const pro = props.project;
  const url = `https://gitpod.io#${pro.web_url}`;
  if (pro.http_url_to_repo || pro.ssh_url_to_repo) {
    return (
      <GitLabOpenInBrowserAction
        title="Clone in Gitpod"
        shortcut={props.shortcut}
        icon={{ source: "gitpod.png" }}
        url={url}
      />
    );
  } else {
    return null;
  }
}

export function ShowProjectLabels(props: { project: Project; shortcut?: Keyboard.Shortcut }): JSX.Element {
  return (
    <Action.Push
      title="Labels"
      target={<ProjectLabelList project={props.project} />}
      shortcut={props.shortcut}
      icon={{ source: GitLabIcons.labels, tintColor: Color.PrimaryText }}
    />
  );
}

export function OpenProjectAction(props: { project: Project }): JSX.Element {
  return (
    <Action.Push
      title="Open Project"
      icon={{ source: Icon.Terminal, tintColor: Color.PrimaryText }}
      target={<ProjectNavMenusList project={props.project} />}
    />
  );
}

export function OpenProjectInBrowserAction(props: { project: Project }): JSX.Element {
  return <GitLabOpenInBrowserAction url={props.project.web_url} />;
}

export function ProjectDefaultActions(props: { project: Project }): JSX.Element {
  if (getPrimaryActionPreference() === PrimaryAction.Detail) {
    return (
      <React.Fragment>
        <OpenProjectAction project={props.project} />
        <OpenProjectInBrowserAction project={props.project} />
      </React.Fragment>
    );
  } else {
    return (
      <React.Fragment>
        <OpenProjectInBrowserAction project={props.project} />
        <OpenProjectAction project={props.project} />
      </React.Fragment>
    );
  }
}

export function CopyProjectIDToClipboardAction(props: { project: Project }): JSX.Element {
  return <Action.CopyToClipboard title="Copy Project ID" content={props.project.id} />;
}

export function OpenProjectIssuesPushAction(props: { project: Project }): JSX.Element {
  return (
    <Action.Push
      title="Issues"
      shortcut={{ modifiers: ["cmd"], key: "i" }}
      icon={{ source: GitLabIcons.issue, tintColor: Color.PrimaryText }}
      target={<IssueList scope={IssueScope.all} project={props.project} />}
    />
  );
}

export function OpenProjectMergeRequestsPushAction(props: { project: Project }): JSX.Element {
  return (
    <Action.Push
      title="Merge Requests"
      shortcut={{ modifiers: ["cmd"], key: "m" }}
      icon={{ source: GitLabIcons.merge_request, tintColor: Color.PrimaryText }}
      target={<MRList scope={MRScope.all} project={props.project} />}
    />
  );
}

export function OpenProjectBranchesPushAction(props: { project: Project }): JSX.Element {
  return (
    <Action.Push
      title="Branches"
      shortcut={{ modifiers: ["cmd"], key: "b" }}
      icon={{ source: GitLabIcons.branches, tintColor: Color.PrimaryText }}
      target={<BranchList project={props.project} />}
    />
  );
}

export function OpenProjectPipelinesPushAction(props: { project: Project }): JSX.Element {
  return (
    <Action.Push
      title="Pipelines"
      shortcut={{ modifiers: ["cmd"], key: "p" }}
      icon={{ source: GitLabIcons.ci, tintColor: Color.PrimaryText }}
      target={<PipelineList projectFullPath={props.project.fullPath} />}
    />
  );
}

export function OpenProjectMilestonesPushAction(props: { project: Project }): JSX.Element {
  return (
    <Action.Push
      title="Milestones"
      shortcut={{ modifiers: ["cmd"], key: "s" }}
      icon={{ source: GitLabIcons.milestone, tintColor: Color.PrimaryText }}
      target={<MilestoneList project={props.project} />}
    />
  );
}

function webUrl(project: Project, partial: string) {
  return getGitLabGQL().urlJoin(`${project.fullPath}/${partial}`);
}

export function OpenProjectLabelsInBrowserAction(props: { project: Project }): JSX.Element {
  return (
    <GitLabOpenInBrowserAction
      title="Labels"
      icon={{ source: GitLabIcons.labels, tintColor: Color.PrimaryText }}
      url={webUrl(props.project, "-/labels")}
    />
  );
}

export function OpenProjectSecurityComplianceInBrowserAction(props: { project: Project }): JSX.Element {
  return (
    <GitLabOpenInBrowserAction
      title="Security & Compliance"
      icon={{ source: GitLabIcons.security, tintColor: Color.PrimaryText }}
      url={webUrl(props.project, "-/security/discover")}
    />
  );
}

export function OpenProjectSettingsInBrowserAction(props: { project: Project }): JSX.Element {
  return (
    <GitLabOpenInBrowserAction
      title="Settings"
      icon={{ source: GitLabIcons.settings, tintColor: Color.PrimaryText }}
      url={webUrl(props.project, "edit")}
    />
  );
}
