import { Action, ActionPanel, Icon, getPreferenceValues } from "@raycast/api";
import { ProcessInfo } from "../models/interfaces";
import { KillSignal, killProcess } from "../utilities/killProcess";

const preferences = getPreferenceValues<Preferences>();
export default function KillAllActions(props: {
  process: ProcessInfo;
  onKilled?: () => Promise<void> | void;
  onError?: (error: unknown) => Promise<void> | void;
}) {
  if (preferences.killSignal === KillSignal.KILL || preferences.killSignal === KillSignal.TERM) {
    return (
      <Action
        title="Killall"
        icon={Icon.XMarkCircle}
        onAction={async () =>
          await killProcess(props.process, {
            killSignal: preferences.killSignal,
            killAll: true,
            onKilled: props.onKilled,
            onError: props.onError,
          })
        }
      />
    );
  }

  return (
    <ActionPanel.Submenu title="Killall" icon={Icon.XMarkCircle}>
      <Action
        title="With SIGTERM"
        onAction={async () =>
          await killProcess(props.process, {
            killSignal: KillSignal.TERM,
            killAll: true,
            onKilled: props.onKilled,
            onError: props.onError,
          })
        }
      />
      <Action
        title="With SIGKILL"
        onAction={async () =>
          await killProcess(props.process, {
            killSignal: KillSignal.KILL,
            killAll: true,
            onKilled: props.onKilled,
            onError: props.onError,
          })
        }
      />
    </ActionPanel.Submenu>
  );
}
