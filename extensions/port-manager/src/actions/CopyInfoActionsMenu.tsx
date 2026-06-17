import { Action, ActionPanel, Icon } from "@raycast/api";
import { ProcessInfo } from "../models/interfaces";

export default function CopyInfoActionsMenu(props: { process: ProcessInfo }) {
  return (
    <ActionPanel.Submenu title="Copy Info" icon={Icon.Clipboard} shortcut={{ modifiers: ["cmd", "opt"], key: "i" }}>
      <Action.CopyToClipboard content={props.process.pid} title="PID" />
      {props.process.path !== undefined && <Action.CopyToClipboard content={props.process.path} title="Path" />}
      {props.process.name ? <Action.CopyToClipboard content={props.process.name} title="Name" /> : null}
      {props.process.parentPid ? <Action.CopyToClipboard content={props.process.parentPid} title="Parent PID" /> : null}
      {props.process.parentPath !== undefined && (
        <Action.CopyToClipboard content={props.process.parentPath} title="Parent Path" />
      )}
      {props.process.uid ? <Action.CopyToClipboard content={props.process.uid} title="User UID" /> : null}
      {props.process.user ? <Action.CopyToClipboard content={props.process.user} title="User Name" /> : null}
    </ActionPanel.Submenu>
  );
}
