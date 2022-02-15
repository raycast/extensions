import { ActionPanel, CopyToClipboardAction, Icon } from "@raycast/api";
import { title } from "process";
import { IProcessInfo } from "../models/interfaces";

export function CopyCommandsActionsMenu(props: { process: IProcessInfo }) {
  return (
    <ActionPanel.Submenu title="Copy Commands" icon={Icon.Clipboard}>
      <CopyToClipboardAction
        content={`sudo kill -9 ${props.process.pid}`}
        title="Kill"
        icon=""
      />
      <CopyToClipboardAction
        content={`sudo killall -9 ${props.process.name?.replace(" ", " ")}`}
        title="Kill All"
        icon=""
      />
    </ActionPanel.Submenu>
  );
}
