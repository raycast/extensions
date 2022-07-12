import { ActionPanel, Icon, Action } from "@raycast/api";
import { IProcessInfo } from "../models/interfaces";

export default function CopyInfoActionsMenu(props: { process: IProcessInfo }) {
  return (
    <ActionPanel.Submenu title="Copy Info" icon={Icon.Clipboard} shortcut={{ modifiers: ["cmd"], key: "c" }}>
      <Action.CopyToClipboard content={props.process.pid} title="PID" icon="" />
      {props.process.name ? <Action.CopyToClipboard content={props.process.name} title="Name" icon="" /> : null}
      {props.process.parentPid ? (
        <Action.CopyToClipboard content={props.process.parentPid} title="Parent PID" icon="" />
      ) : null}
      {props.process.uid ? <Action.CopyToClipboard content={props.process.uid} title="User UID" icon="" /> : null}
      {props.process.user ? <Action.CopyToClipboard content={props.process.user} title="User Name" icon="" /> : null}
    </ActionPanel.Submenu>
  );
}
