import { Action, ActionPanel, Icon, List, LocalStorage, Toast, showToast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { ensureSwitchAudioSourceInstalled, getCurrentInputDevice, installSwitchAudioSource } from "./lib/audio";
import { disableMicLock, enableMicLock } from "./lib/lock";
import { STORAGE_KEYS } from "./lib/storage";

type State = {
  isLoading: boolean;
  isEnabled: boolean;
  preferredMic: string;
};

export default function Command() {
  const [state, setState] = useState<State>({
    isLoading: true,
    isEnabled: false,
    preferredMic: "",
  });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      await ensureSwitchAudioSourceInstalled(() =>
        showToast({
          style: Toast.Style.Animated,
          title: "Installing switchaudio-osx via Homebrew…",
        }),
      );
      const [lockEnabledRaw, preferredMic] = await Promise.all([
        LocalStorage.getItem<string>(STORAGE_KEYS.lockEnabled),
        LocalStorage.getItem<string>(STORAGE_KEYS.preferredMic),
      ]);

      setState({
        isLoading: false,
        isEnabled: lockEnabledRaw === "true",
        preferredMic: preferredMic ?? "",
      });
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }));
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load microphone lock",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle() {
    try {
      if (state.isEnabled) {
        await disableMicLock();
        await LocalStorage.setItem(STORAGE_KEYS.lockEnabled, "false");
        await showToast({ style: Toast.Style.Success, title: "Mic lock: OFF" });
        await load();
        return;
      }

      await ensureSwitchAudioSourceInstalled();
      const targetMic = state.preferredMic || (await getCurrentInputDevice());

      if (!targetMic) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to enable mic lock",
          message: "Select a microphone first in the Select Default Mic command",
        });
        return;
      }

      await enableMicLock(targetMic);
      await LocalStorage.setItem(STORAGE_KEYS.lockEnabled, "true");
      await LocalStorage.setItem(STORAGE_KEYS.preferredMic, targetMic);
      await showToast({ style: Toast.Style.Success, title: `Mic lock: ON (${targetMic})` });
      await load();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to toggle mic lock",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function handleInstallDependency() {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Installing switchaudio-osx…" });
      await installSwitchAudioSource();
      await showToast({
        style: Toast.Style.Success,
        title: "SwitchAudioSource is ready",
      });
      await load();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to install switchaudio-osx",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const statusTitle = state.isEnabled ? "Mic Lock is ON" : "Mic Lock is OFF";
  const statusIcon = state.isEnabled ? Icon.Lock : Icon.LockUnlocked;
  const primaryActionTitle = state.isEnabled ? "Disable Mic Lock" : "Enable Mic Lock";

  return (
    <List isLoading={state.isLoading}>
      <List.Item
        title={statusTitle}
        icon={statusIcon}
        accessories={
          state.preferredMic ? [{ tag: `Target: ${state.preferredMic}` }] : [{ tag: "Target: not selected" }]
        }
        actions={
          <ActionPanel>
            <Action title={primaryActionTitle} onAction={toggle} />
            <Action title="Install SwitchAudioSource" icon={Icon.Download} onAction={handleInstallDependency} />
            <Action title="Refresh Status" onAction={load} />
          </ActionPanel>
        }
      />
    </List>
  );
}
