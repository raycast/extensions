import { Action, ActionPanel, Icon, confirmAlert, getPreferenceValues } from "@raycast/api";
import Alerts from "../feedback/Alerts";
import Process from "../models/Process";
import { KillSignal, killProcess, resolveKillSignal } from "../utilities/killProcess";
import { isWindows, platformShortcut } from "../utilities/platform";

export type ProcessWithKillableParent = Process & {
  parentPid: number;
};

export function isProcessWithKillableParent(processInfo: Process): processInfo is ProcessWithKillableParent {
  const minimumKillableParentPid = isWindows ? 4 : 1;
  return processInfo.parentPid !== undefined && processInfo.parentPid > minimumKillableParentPid;
}

const preferences = getPreferenceValues<Preferences>();
const killParentShortcut = platformShortcut(
  { modifiers: ["cmd", "opt"], key: "p" },
  { modifiers: ["ctrl", "opt"], key: "p" },
);

export default function KillParentActions(props: {
  process: Process;
  onError?: (err: unknown) => Promise<void> | void;
  onKilled?: () => Promise<void> | void;
}) {
  if (!isProcessWithKillableParent(props.process)) {
    return null;
  }

  if (isWindows || preferences.killSignal === KillSignal.KILL || preferences.killSignal === KillSignal.TERM) {
    return (
      <Action
        title="Kill Parent"
        icon={Icon.ExclamationMark}
        shortcut={killParentShortcut}
        onAction={async () => {
          if (await confirmAlert(Alerts.KillParentProcess(props.process))) {
            await killProcess(props.process, {
              killSignal: resolveKillSignal(preferences.killSignal),
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
    <ActionPanel.Submenu title="Kill Parent…" icon={Icon.ExclamationMark} shortcut={killParentShortcut}>
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
