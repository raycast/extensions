import { ActionPanel, Icon, Action } from "@raycast/api";
import { IProcessInfo } from "../models/interfaces";

export function CopyCommandsActionsMenu(props: { process: IProcessInfo }) {
  return (
    <ActionPanel.Submenu title="Copy Commands" icon={Icon.Clipboard}>
      <Action.CopyToClipboard content={`sudo kill -9 ${props.process.pid}`} title="Kill" icon="" />
      <Action.CopyToClipboard
        content={`sudo killall -9 ${props.process.name?.replace(" ", " ")}`}
        title="Kill All"
        icon=""
      />
    </ActionPanel.Submenu>
  );
}
