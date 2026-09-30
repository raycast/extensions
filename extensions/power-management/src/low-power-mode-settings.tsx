import { Action, ActionPanel, Color, Icon, LaunchType, List, Toast, launchCommand, showToast } from "@raycast/api";
import { PowerMode, PowerModeTarget, getPowerModeDetails, setPowerMode } from "./utils/powerManagement";
import { useEffect, useState } from "react";

async function togglePowerMode(currentSetting: boolean, target: PowerModeTarget): Promise<void> {
  await setPowerMode(currentSetting ? PowerMode.Normal : PowerMode.Low, target);

  launchCommand({ name: "lowpower-menubar", type: LaunchType.Background }).catch(() => {
    console.debug("low-power-menubar is disabled");
  });
}

export default function Command() {
  const [batteryPower, setBatteryPower] = useState<boolean>();
  const [acPower, setACPower] = useState<boolean>();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const details = getPowerModeDetails();
    setBatteryPower(details.battery);
    setACPower(details.ac);
    setIsLoading(false);
  });

  return (
    <List navigationTitle="Low Power Mode Settings" isLoading={isLoading}>
      <List.Item
        title="Low Power on AC Power"
        subtitle={acPower ? "Enabled" : "Disabled"}
        icon={{
          source: Icon.Plug,
          tintColor: acPower ? Color.Yellow : Color.Blue,
        }}
        actions={
          <ActionPanel>
            <Action
              title={acPower ? "Disable" : "Enable"}
              onAction={async () => {
                setIsLoading(true);

                try {
                  await togglePowerMode(Boolean(acPower), PowerModeTarget.AC);
                } catch {
                  setIsLoading(false);

                  showToast({
                    title: "Failed to toggle low power mode on AC power.",
                    style: Toast.Style.Failure,
                  });

                  return;
                }

                setACPower(!acPower);
                setIsLoading(false);

                showToast({
                  title: `Low power mode on AC power is turned ${acPower ? "off" : "on"}`,
                  style: Toast.Style.Success,
                });
              }}
            />
          </ActionPanel>
        }
      />
      <List.Item
        title="Low Power on Battery Power"
        subtitle={batteryPower ? "Enabled" : "Disabled"}
        icon={{
          source: Icon.Battery,
          tintColor: batteryPower ? Color.Yellow : Color.Blue,
        }}
        actions={
          <ActionPanel>
            <Action
              title={batteryPower ? "Disable" : "Enable"}
              onAction={async () => {
                setIsLoading(true);

                try {
                  await togglePowerMode(Boolean(batteryPower), PowerModeTarget.Battery);
                } catch {
                  setIsLoading(false);

                  showToast({
                    title: "Failed to toggle low power mode on battery power.",
                    style: Toast.Style.Failure,
                  });

                  return;
                }

                setBatteryPower(!batteryPower);
                setIsLoading(false);

                showToast({
                  title: `Low power mode on battery power is turned ${batteryPower ? "off" : "on"}`,
                  style: Toast.Style.Success,
                });
              }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
