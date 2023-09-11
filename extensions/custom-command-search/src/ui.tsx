import { Cmd } from "./utils";
import { Action, ActionPanel, List } from "@raycast/api";

export function generateCmd(cmd: Cmd): JSX.Element {
  if (cmd.cmd.startsWith("http")) {
    return generateUrlCmd(cmd);
  }
  return generateDefaultCmd(cmd);
}

/**
 * for http cmd
 */
function generateUrlCmd(cmd: Cmd): JSX.Element {
  return (
    <List.Item
      icon="list-icon.png"
      title={cmd.remark}
      key={cmd.cmd}
      subtitle={cmd.cmd}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open In Browser" url={cmd.cmd} />
          <Action.CopyToClipboard title="Copy URL To Clipboard" content={cmd.cmd} />
        </ActionPanel>
      }
    />
  );
}

function generateDefaultCmd(cmd: Cmd): JSX.Element {
  return (
    <List.Item
      icon="list-icon.png"
      title={cmd.remark}
      key={cmd.cmd}
      subtitle={cmd.cmd}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy URL To Clipboard" content={cmd.cmd} />
        </ActionPanel>
      }
    />
  );
}
