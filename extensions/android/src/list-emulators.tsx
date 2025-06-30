import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Keyboard,
  List,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  adbPath,
  androidSDK,
  executeAsync,
  isAndroidStudioInstalled,
  isValidDirectory,
  setTmeoutAsync,
} from "./util/utils";
import { Emulator, EmulatorState } from "./types/Emulator";
import EmitTextForm from "./components/emitTextForm";
import SetBatteryPercentageForm from "./components/setBatteryPercentageForm";
import SetNetworkSpeedForm from "./components/setNetworkSpeedForm";
import SimulateCallForm from "./components/simulateCallForm";
import SimulateSMSForm from "./components/simulateSMSForm";
import {
  getEmulators,
  getRunningEmulators,
  startEmulator,
} from "./util/emulatorUtil";
import SimulateFingerprintForm from "./components/simulateFingerprintForm";

export default function Command() {
  const [items, setItems] = useState<Emulator[]>(() => []);
  const [loading, setLoading] = useState(true);

  async function listEmulators() {
    if (!isAndroidStudioInstalled()) {
      showToast(Toast.Style.Failure, "Android studio is not installed");
      setLoading(false);
      return;
    }

    if (!isValidDirectory(androidSDK())) {
      showToast(Toast.Style.Failure, "Invalid Android SDK directory!!");
      setLoading(false);
      return;
    }

    try {
      const emulators = await getEmulators();
      setLoading(false);
      setItems(emulators);
    } catch (error) {
      setLoading(false);
      await showToast({
        title: "Error getting Emulators",
        style: Toast.Style.Failure,
      });
    }
  }
  useEffect(() => {
    listEmulators().then();
  }, []);

  async function shutdownEmulator(emulator: Emulator) {
    const toast = await showToast({
      title: "Shutting Down..",
      style: Toast.Style.Animated,
    });
    const response = await executeAsync(
      `${adbPath} -s ${emulator.id} emu kill`
    );
    await waitForShutdown(emulator);
    await toast.hide();
    await showToast({ title: response.trim(), style: Toast.Style.Success });
    await listEmulators();
  }

  async function shakeEmulator(emulator: Emulator) {
    const toast = await showToast({
      title: "Shaking emulator..",
      style: Toast.Style.Animated,
    });
    const response = await executeAsync(
      `${adbPath} -s ${emulator.id} emu sensor set acceleration 100:100:100; sleep 1; ${adbPath} -s ${emulator.id} emu sensor set acceleration 0:0:0`
    );

    await showToast({ title: response.trim(), style: Toast.Style.Success });
    toast.hide();
  }

  async function restartEmulator(emulator: Emulator) {
    await shutdownEmulator(emulator);
    const toast = await showToast({
      title: "Starting..",
      style: Toast.Style.Animated,
    });
    toast.hide();
    startEmulator(emulator.name, undefined, undefined);
    await showToast({ title: "Executed" });
    await listEmulators();
  }

  async function waitForShutdown(emulator: Emulator) {
    const devices = await getRunningEmulators();
    const isShutdown =
      devices.filter((item) => item.name === emulator.name).length === 0;
    if (!isShutdown) {
      await setTmeoutAsync(1000);
      await waitForShutdown(emulator);
    }
  }

  async function fold(emulator: Emulator) {
    const response = await executeAsync(
      `${adbPath} -s ${emulator.id} emu fold`
    );
    await showToast({ title: response.trim() });
  }

  async function unfold(emulator: Emulator) {
    const response = await executeAsync(
      `${adbPath} -s ${emulator.id} emu unfold`
    );
    await showToast({ title: response.trim() });
  }

  async function rotate(emulator: Emulator) {
    const response = await executeAsync(
      `${adbPath} -s ${emulator.id} emu rotate`
    );
    await showToast({ title: response.trim() });
  }

  async function setAcCharging(setCharging: boolean, emulator: Emulator) {
    const chargingState = setCharging ? "on" : "off";
    const response = await executeAsync(
      `${adbPath} -s ${emulator.id} emu power ac ${chargingState}`
    );
    await showToast({ title: response.trim() });
  }

  return (
    <List isLoading={loading}>
      {items?.map((emulator) => (
        <List.Item
          icon={{ source: "android-emulator.png" }}
          key={emulator.name}
          title={emulator.name}
          accessories={[
            {
              text: emulator.state,
              icon:
                emulator.state === EmulatorState.Running
                  ? {
                      source: Icon.Checkmark,
                      tintColor: Color.Green,
                    }
                  : null,
            },
          ]}
          actions={
            <ActionPanel>
              {emulator.state === EmulatorState.Running && (
                <>
                  <ActionPanel.Section title="Shutdown/Restart">
                    <Action
                      title="Shutdown"
                      icon={Icon.Power}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
                      onAction={() => shutdownEmulator(emulator)}
                    />

                    <Action
                      title="Restart"
                      icon={Icon.ArrowClockwise}
                      shortcut={Keyboard.Shortcut.Common.Refresh}
                      onAction={() => restartEmulator(emulator)}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section title="Sensors">
                    <Action
                      title="Shake"
                      icon={Icon.PhoneRinging}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                      onAction={() => shakeEmulator(emulator)}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section title="Fold/UnFold">
                    <Action
                      title="Fold"
                      icon={Icon.Mobile}
                      shortcut={{ modifiers: ["cmd"], key: "f" }}
                      onAction={() => fold(emulator)}
                    />

                    <Action
                      title="UnFold"
                      icon={Icon.Mobile}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                      onAction={() => unfold(emulator)}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section title="Power Control">
                    <Action.Push
                      icon={Icon.Battery}
                      title="Set Battery Percentage"
                      shortcut={{ modifiers: ["cmd"], key: "b" }}
                      target={<SetBatteryPercentageForm emulator={emulator} />}
                    />

                    <Action
                      icon={Icon.BatteryCharging}
                      title="Set Charging ON"
                      shortcut={{ modifiers: ["cmd", "ctrl"], key: "c" }}
                      onAction={() => setAcCharging(true, emulator)}
                    />

                    <Action
                      icon={Icon.BatteryDisabled}
                      title="Set Charging OFF"
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                      onAction={() => setAcCharging(false, emulator)}
                    />
                  </ActionPanel.Section>

                  <Action
                    icon={Icon.RotateClockwise}
                    title="Rotate"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                    onAction={() => rotate(emulator)}
                  />

                  <Action.Push
                    icon={Icon.Text}
                    title="Emit Text"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                    target={<EmitTextForm emulator={emulator} />}
                  />

                  <Action.Push
                    icon={Icon.Signal2}
                    title="Set Network Speed"
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    target={<SetNetworkSpeedForm emulator={emulator} />}
                  />

                  <Action.Push
                    icon={Icon.PhoneRinging}
                    title="Simulate Call"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                    target={<SimulateCallForm emulator={emulator} />}
                  />

                  <Action.Push
                    icon={Icon.Fingerprint}
                    title="Simulate Fingerprint"
                    target={<SimulateFingerprintForm emulator={emulator} />}
                  />

                  <Action.Push
                    icon={Icon.Message}
                    title="Simulate SMS"
                    shortcut={{ modifiers: ["cmd"], key: "s" }}
                    target={<SimulateSMSForm emulator={emulator} />}
                  />
                </>
              )}

              {emulator.state === EmulatorState.Shutdown && (
                <Action
                  title="Start"
                  icon={Icon.Power}
                  onAction={() => openEmulator(emulator.name)}
                />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function openEmulator(emulator: string) {
  startEmulator(
    emulator,
    (data) => {
      popToRoot;
    },
    (error) => {
      // showToast(Toast.Style.Failure, error);
    }
  );
}
