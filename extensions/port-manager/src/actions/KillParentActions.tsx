import { ActionPanel, Icon, Action, confirmAlert, Alert } from "@raycast/api";
import ProcessInfo from "../models/ProcessInfo";
import { handleKill } from "../utilities/handleKill";
import { kill, KillSignal } from "../utilities/killProcess";

export interface IProcessInfoWithParent extends Omit<ProcessInfo, "parentPid"> {
  parentPid: number;
}

const alertOptions: Alert.Options = {
  title: "CHANGE ME",
  message: "Killing some processes might crash apps or even your system",
  primaryAction: {
    title: "Kill",
  },
  dismissAction: {
    title: "Cancel",
  },
};

export default function KillParentActionsMenu(props: {
  process: IProcessInfoWithParent;
  reloadCallback?: () => Promise<void>;
}) {
  return (
    <ActionPanel.Submenu title="Kill Parent" icon={Icon.ExclamationMark} shortcut={{ modifiers: ["cmd"], key: "p" }}>
      <Action
        title="With SIGTERM"
        onAction={async () => {
          alertOptions.title = `Kill Process ${props.process.parentPid}?`;
          if (await confirmAlert(alertOptions)) {
            await handleKill(props.process, async () => await kill(props.process.parentPid), props.reloadCallback);
          } else {
            return;
          }
        }}
      />
      <Action
        title="With SIGKILL"
        onAction={async () => {
          alertOptions.title = `Kill Process ${props.process.parentPid}?`;
          if (await confirmAlert(alertOptions)) {
            await handleKill(
              props.process,
              async () => await kill(props.process.parentPid, KillSignal.KILL),
              props.reloadCallback
            );
          } else {
            return;
          }
        }}
      />
    </ActionPanel.Submenu>
  );
}
