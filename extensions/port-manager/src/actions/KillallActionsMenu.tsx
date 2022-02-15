import { ActionPanel, Icon } from "@raycast/api";
import { IProcessInfo } from "../models/interfaces";
import { handleKill } from "../utilities/handleKill";
import { killall, KillSignal } from "../utilities/killProcess";

export default function KillallActionsMenu(props: { process: IProcessInfo; reloadCallback?: () => Promise<void> }) {
  return (
    <ActionPanel.Submenu title="Killall" icon={Icon.XmarkCircle}>
      <ActionPanel.Item
        title="With SIGTERM"
        onAction={async () =>
          await handleKill(props.process, async () => await killall(props.process.name ?? ""), props.reloadCallback)
        }
      />
      <ActionPanel.Item
        title="With SIGKILL"
        onAction={async () =>
          await handleKill(
            props.process,
            async () => await killall(props.process.name ?? "", KillSignal.KILL),
            props.reloadCallback
          )
        }
      />
    </ActionPanel.Submenu>
  );
}
