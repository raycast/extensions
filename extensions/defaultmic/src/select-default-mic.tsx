import { Action, ActionPanel, Icon, List, LocalStorage, Toast, showToast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import {
  ensureSwitchAudioSourceInstalled,
  getCurrentInputDevice,
  getInputDevices,
  installSwitchAudioSource,
  setInputDevice,
} from "./lib/audio";
import { STORAGE_KEYS } from "./lib/storage";
import { updateLockedMicTarget } from "./lib/lock";

type MicState = {
  devices: string[];
  current: string;
  preferred: string;
  lockEnabled: boolean;
  isLoading: boolean;
};

export default function Command() {
  const [state, setState] = useState<MicState>({
    devices: [],
    current: "",
    preferred: "",
    lockEnabled: false,
    isLoading: true,
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
      const [devices, current, preferred, lockEnabledRaw] = await Promise.all([
        getInputDevices(),
        getCurrentInputDevice(),
        LocalStorage.getItem<string>(STORAGE_KEYS.preferredMic),
        LocalStorage.getItem<string>(STORAGE_KEYS.lockEnabled),
      ]);

      setState({
        devices,
        current,
        preferred: preferred ?? "",
        lockEnabled: lockEnabledRaw === "true",
        isLoading: false,
      });
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }));
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load microphones",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSelect(deviceName: string) {
    try {
      await setInputDevice(deviceName);
      await LocalStorage.setItem(STORAGE_KEYS.preferredMic, deviceName);

      if (state.lockEnabled) {
        await updateLockedMicTarget(deviceName);
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Microphone set",
        message: deviceName,
      });

      await load();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to set microphone",
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

  return (
    <List isLoading={state.isLoading}>
      {state.devices.map((device) => {
        const accessories: List.Item.Accessory[] = [];

        if (device === state.current) {
          accessories.push({ tag: "Current" });
        }

        if (device === state.preferred) {
          accessories.push({ tag: state.lockEnabled ? "Locked Target" : "Preferred" });
        }

        return (
          <List.Item
            key={device}
            title={device}
            icon={device === state.current ? Icon.CheckCircle : Icon.Microphone}
            accessories={accessories}
            actions={
              <ActionPanel>
                <Action title="Set as Default Mic" onAction={() => handleSelect(device)} />
                <Action title="Install SwitchAudioSource" icon={Icon.Download} onAction={handleInstallDependency} />
                <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={load} />
                <Action.CopyToClipboard content={device} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
