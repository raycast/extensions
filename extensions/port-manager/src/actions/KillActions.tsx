import { Action, ActionPanel, Icon, getPreferenceValues } from "@raycast/api";
import { ProcessInfo } from "../models/interfaces";
import { KillSignal, killProcess } from "../utilities/killProcess";

const preferences = getPreferenceValues<Preferences>();

export default function KillActions(props: {
  process: ProcessInfo;
  onKilled?: () => Promise<void> | void;
  onError?: (err: unknown) => Promise<void> | void;
}) {
  if (preferences.killSignal === KillSignal.TERM || preferences.killSignal === KillSignal.KILL) {
    return (
      <Action
        title="Kill"
        icon={Icon.ExclamationMark}
        onAction={async () =>
          await killProcess(props.process, {
            killSignal: preferences.killSignal,
            onKilled: props.onKilled,
            onError: props.onError,
          })
        }
      />
    );
  }

  return (
    <ActionPanel.Submenu title="Kill" icon={Icon.ExclamationMark}>
      <Action
        title="With SIGTERM"
        onAction={async () =>
          await killProcess(props.process, {
            killSignal: KillSignal.TERM,
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
            onKilled: props.onKilled,
            onError: props.onError,
          })
        }
      />
    </ActionPanel.Submenu>
  );
}
