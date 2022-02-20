import {
  ActionPanel,
  ActionPanelItem,
  closeMainWindow,
  Color,
  Icon,
  KeyboardShortcut,
  List,
  ListItem,
  popToRoot,
  PushAction,
  showToast,
  ToastStyle,
} from "@raycast/api";
import * as open from "open";
import React from "react";
import { getPrimaryActionPreference, PrimaryAction } from "../common";
import { Project } from "../gitlabapi";
import { GitLabIcons } from "../icons";
import { getErrorMessage } from "../utils";
import { getVSCodeAppPath } from "../vscode";
import { GitLabOpenInBrowserAction } from "./actions";
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
      showToast(ToastStyle.Failure, "Could not clone in VSCode", getErrorMessage(e));
    }
  };
  if (props.url && props.url.length > 0) {
    return (
      <ListItem
        title={props.url}
        icon={{ fileIcon: getVSCodeAppPath() || "" }}
        actions={
          <ActionPanel>
            <ActionPanelItem title="Clone" onAction={() => clone(props.url || "")} />
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
  shortcut?: KeyboardShortcut;
  project: Project;
}): JSX.Element | null {
  const pro = props.project;
  const code = getVSCodeAppPath();
  if (code && (pro.http_url_to_repo || pro.ssh_url_to_repo)) {
    return (
      <PushAction
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

export function CloneProjectInGitPod(props: { shortcut?: KeyboardShortcut; project: Project }): JSX.Element | null {
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

export function ShowProjectLabels(props: { project: Project; shortcut?: KeyboardShortcut }): JSX.Element {
  return (
    <PushAction
      title="Labels"
      target={<ProjectLabelList project={props.project} />}
      shortcut={props.shortcut}
      icon={{ source: GitLabIcons.labels, tintColor: Color.PrimaryText }}
    />
  );
}

export function OpenProjectAction(props: { project: Project }): JSX.Element {
  return (
    <PushAction
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
