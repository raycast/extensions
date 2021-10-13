import {
  ActionPanel,
  ActionPanelItem,
  closeMainWindow,
  KeyboardShortcut,
  List,
  ListItem,
  popToRoot,
  PushAction,
  showToast,
  ToastStyle,
} from "@raycast/api";
import * as open from "open";
import { Project } from "../gitlabapi";
import { getVSCodeAppPath } from "../vscode";

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
    } catch (e: any) {
      showToast(ToastStyle.Failure, "Could not clone in VSCode", e);
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

function CloneInVSCodeList(props: { project: Project }) {
  return (
    <List navigationTitle="Clone in VSCode">
      <CloneURLInVSCodeListItem url={props.project.ssh_url_to_repo} />
      <CloneURLInVSCodeListItem url={props.project.http_url_to_repo} />
    </List>
  );
}

export function CloneProjectInVSCodeAction(props: { shortcut?: KeyboardShortcut; project: Project }) {
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
