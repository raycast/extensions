import { Action, ActionPanel, Icon, confirmAlert, getPreferenceValues } from "@raycast/api";
import Alerts from "../feedback/Alerts";
import Process from "../models/Process";
import { KillSignal, killProcess } from "../utilities/killProcess";

export type ProcessWithKillableParent = Process & {
  parentPid: number;
};

export function isProcessWithKillableParent(process: Process): process is ProcessWithKillableParent {
  return process.parentPid !== undefined && process.parentPid !== 1;
}

const preferences = getPreferenceValues<Preferences>();

export default function KillParentActions(props: {
  process: Process;
  onError?: (err: unknown) => Promise<void> | void;
  onKilled?: () => Promise<void> | void;
}) {
  if (!isProcessWithKillableParent(props.process)) {
    return null;
  }

  if (preferences.killSignal === KillSignal.KILL || preferences.killSignal === KillSignal.TERM) {
    return (
      <Action
        title="Kill Parent"
        icon={Icon.ExclamationMark}
        shortcut={{ modifiers: ["cmd", "opt"], key: "p" }}
        onAction={async () => {
          if (await confirmAlert(Alerts.KillParentProcess(props.process))) {
            await killProcess(props.process, {
              killSignal: preferences.killSignal,
              killParent: true,
              onKilled: props.onKilled,
              onError: props.onError,
            });
          } else {
            return;
          }
        }}
      />
    );
  }

  return (
    <ActionPanel.Submenu
      title="Kill Parent"
      icon={Icon.ExclamationMark}
      shortcut={{ modifiers: ["cmd", "opt"], key: "p" }}
    >
      <Action
        title="With SIGTERM"
        onAction={async () => {
          if (await confirmAlert(Alerts.KillParentProcess(props.process))) {
            await killProcess(props.process, {
              killSignal: KillSignal.TERM,

              killParent: true,
              onKilled: props.onKilled,
              onError: props.onError,
            });
          } else {
            return;
          }
        }}
      />
      <Action
        title="With SIGKILL"
        onAction={async () => {
          if (await confirmAlert(Alerts.KillParentProcess(props.process))) {
            await killProcess(props.process, {
              killSignal: KillSignal.KILL,
              killParent: true,
              onKilled: props.onKilled,
              onError: props.onError,
            });
          } else {
            return;
          }
        }}
      />
    </ActionPanel.Submenu>
  );
}
