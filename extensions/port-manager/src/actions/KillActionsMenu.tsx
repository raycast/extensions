import { ActionPanel, Icon } from "@raycast/api";
import { IProcessInfo } from "../models/interfaces";
import { handleKill } from "../utilities/handleKill";
import { kill, KillSignal } from "../utilities/killProcess";

export default function KillActionsMenu(props: { process: IProcessInfo; reloadCallback?: () => Promise<void> }) {
  return (
    <ActionPanel.Submenu title="Kill" icon={Icon.ExclamationMark}>
      <ActionPanel.Item
        title="With SIGTERM"
        onAction={async () =>
          await handleKill(props.process, async () => await kill(props.process.pid), props.reloadCallback)
        }
      />
      <ActionPanel.Item
        title="With SIGKILL"
        onAction={async () =>
          await handleKill(
            props.process,
            async () => await kill(props.process.pid, KillSignal.KILL),
            props.reloadCallback
          )
        }
      />
    </ActionPanel.Submenu>
  );
}
