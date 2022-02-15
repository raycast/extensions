import { ActionPanel, Icon, CopyToClipboardAction } from "@raycast/api";
import { IProcessInfo } from "../models/interfaces";


export default function CopyInfoActionsMenu(props: { process: IProcessInfo }) {
  return (
    <ActionPanel.Submenu title="Copy Info" icon={Icon.Clipboard}>
      <CopyToClipboardAction content={props.process.pid} title="PID" icon="" />
      {props.process.name ? <CopyToClipboardAction content={props.process.name} title="Name" icon="" /> : null}
      {props.process.parentPid ? (
        <CopyToClipboardAction content={props.process.parentPid} title="Parent PID" icon="" />
      ) : null}
      {props.process.uid ? <CopyToClipboardAction content={props.process.uid} title="User UID" icon="" /> : null}
      {props.process.user ? <CopyToClipboardAction content={props.process.user} title="User Name" icon="" /> : null}
      <CopyToClipboardAction content={`sudo kill -9 ${props.process.pid}`} title="Kill Command" icon="" />
      <CopyToClipboardAction content={`sudo killall -9 ${props.process.name?.replace(' ', '\ ')}`} title="Killall Command" icon="" />
    </ActionPanel.Submenu>
  );
}
