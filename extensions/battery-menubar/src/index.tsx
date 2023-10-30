import { Color, getPreferenceValues, Icon, MenuBarExtra, open } from "@raycast/api";
import { runAppleScript, useCachedPromise, useCachedState } from "@raycast/utils";
import { cpus, loadavg } from "os";

import { exec } from "child_process";
import { promisify } from "util";
import { BatteryState, getBatteryState } from "./BatteryState";
import { CPUStats, getCPUStats, calculateCPUUsage } from "./CPUStats";

export const execp = promisify(exec);

type BatteryAndCPUState = BatteryState & { cpu: CPUStats };

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [batt, setBattState] = useCachedState<{
    prev: BatteryAndCPUState | null;
    next: BatteryAndCPUState;
    latest: BatteryAndCPUState;
  } | null>("batteryAndCPUState", null);

  const { isLoading: battIsLoading } = useCachedPromise(getBatteryState, [], {
    onData(data) {
      const cpu = getCPUStats();
      const battAndCPU = { ...data, cpu };
      if (!batt || (batt.prev && batt.prev.time < Date.now() - 5 * 60 * 1000)) {
        console.log("Resetting battery state", battAndCPU);
        setBattState({ prev: null, next: battAndCPU, latest: battAndCPU });
      } else if (batt.next.time < Date.now() - 60 * 1000 || batt.next.watts !== data.watts) {
        console.log("Storing next battery state", battAndCPU);
        setBattState({ prev: batt.next, next: battAndCPU, latest: battAndCPU });
      } else {
        console.log("Storing latest battery state", battAndCPU);
        setBattState({ prev: batt.prev, next: batt.next, latest: battAndCPU });
      }
    },
  });

  const openBatterySettings = () => {
    open("x-apple.systempreferences:com.apple.preference.battery");
  };

  const openActivityMonitor = () => {
    runAppleScript(`
      tell application "Activity Monitor"
        activate
      end tell
    `);
  };

  const wattDiff =
    batt?.prev?.watts && batt.latest.watts && batt.prev.charging === batt.latest.charging
      ? Math.round((batt.latest.watts - batt.prev.watts) * 10) / 10
      : null;

  const timeRemaining =
    batt && batt.latest.hoursRemaining != null
      ? `${batt.latest.hoursRemaining}:${String(batt.latest.minutesRemaining).padStart(2, "0")}`
      : null;

  const cpuUsage = batt?.prev?.cpu && batt.latest.cpu ? calculateCPUUsage(batt?.prev?.cpu, batt?.latest.cpu) : null;

  const batteryColor = !batt
    ? undefined
    : batt.latest.charging
    ? Color.Blue
    : batt.latest.capacity < 0.1
    ? Color.Red
    : batt.latest.capacity < 0.2
    ? Color.Orange
    : batt.latest.capacity < 0.3
    ? Color.Yellow
    : undefined;

  const remainingColor =
    !batt || batt.latest.charging
      ? undefined
      : batt.latest.timeRemaining == null
      ? Color.SecondaryText
      : batt.latest.timeRemaining < (Number(preferences.remainingRed) || 0) * 60
      ? Color.Red
      : batt.latest.timeRemaining < (Number(preferences.remainingOrange) || 0) * 60
      ? Color.Orange
      : batt.latest.timeRemaining < (Number(preferences.remainingYellow) || 0) * 60
      ? Color.Yellow
      : undefined;

  const powerColor =
    !batt || batt.latest.charging || !batt.latest.watts
      ? undefined
      : -batt.latest.watts > (Number(preferences.highPowerUsage) || 500)
      ? Color.Yellow
      : undefined;

  const iconColor = !batt
    ? Color.SecondaryText
    : batt.latest.charging && batt.latest.capacity == 1
    ? undefined
    : batt.latest.charging
    ? Color.Blue
    : remainingColor
    ? remainingColor
    : powerColor
    ? powerColor
    : undefined;

  const battPct = batt ? Math.round(batt?.latest.capacity * 100) : null;

  return (
    <MenuBarExtra
      icon={
        {
          source:
            battPct == null
              ? Icon.Battery
              : battPct == 100
              ? Icon.BatteryCharging
              : // @ts-expect-error Yep, this is a hack
                Icon[`Number${String(battPct).padStart(2, "0")}`],
          tintColor: iconColor,
        }
        // getProgressIcon(batt?.latest.capacity ?? 0, iconColor)
      }
      isLoading={battIsLoading}
      title={
        preferences.showInfo === "remaining"
          ? timeRemaining || "--:--"
          : preferences.showInfo === "watts"
          ? batt?.latest.watts
            ? `${Math.round(batt.latest.watts * 10) / 10}W`
            : "--W"
          : preferences.showInfo === "percent"
          ? "%"
          : ""
      }
    >
      <MenuBarExtra.Section title="Battery">
        {batt?.latest ? (
          <>
            <MenuBarExtra.Item
              icon={{
                source: batt.latest.connected ? Icon.BatteryCharging : Icon.Battery,
                tintColor: batteryColor,
              }}
              subtitle={batt.latest.charging ? "Charging" : "Discharging"}
              title={`${Math.round(batt.latest.capacity * 100)}%`}
              onAction={openBatterySettings}
            />
            <MenuBarExtra.Item
              icon={{ source: Icon.Clock, tintColor: remainingColor }}
              title={timeRemaining || "--:--"}
              subtitle={batt.latest.charging ? "Time until charged" : "Time remaining"}
              onAction={openBatterySettings}
            />
            <MenuBarExtra.Item
              icon={{ source: Icon.Check, tintColor: iconColor }}
              title={batt.latest.health.toFixed(2) + "%"}
              subtitle={"Battery health"}
              onAction={openBatterySettings}
            />
            <MenuBarExtra.Item
              icon={{ source: Icon.RotateAntiClockwise, tintColor: iconColor }}
              title={batt.latest.cycles.toFixed(0)}
              subtitle={"Battery cycles"}
              onAction={openBatterySettings}
            />

            <MenuBarExtra.Item
              icon={{
                source: Icon.Bolt,
                tintColor: powerColor,
              }}
              title={batt.latest.watts ? `${Math.round(Math.abs(batt.latest.watts))}W` : "--"}
              subtitle={batt.latest.charging ? "Power input (~1 min)" : "Power draw (~1 min)"}
              onAction={openBatterySettings}
            />

            {!batt.latest.charging && wattDiff ? (
              <MenuBarExtra.Item
                icon={{
                  source: wattDiff > 0 ? Icon.Minus : wattDiff < 0 ? Icon.Plus : Icon.Dot,
                  tintColor: wattDiff > 0 ? Color.Green : wattDiff < 0 ? Color.Red : undefined,
                }}
                title={wattDiff != null ? `${Math.abs(wattDiff)}W` : "-"}
                subtitle={
                  wattDiff > 0 ? "Lower draw (~1 min)" : wattDiff < 0 ? "Higher draw (~1 min)" : "No difference"
                }
                tooltip="Change in power draw since last update"
                onAction={openBatterySettings}
              />
            ) : null}
          </>
        ) : null}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="CPU">
        <MenuBarExtra.Item
          icon={Icon.ComputerChip}
          title={cpuUsage != null ? `${Math.round(cpuUsage * 100)}%` : "--"}
          subtitle={"CPU usage (~1 min)"}
          onAction={openActivityMonitor}
        />
        <MenuBarExtra.Item
          icon={Icon.Gauge}
          title={loadavg()
            .map((avg) => `${Math.round(avg * 10) / 10}`)
            .join(", ")}
          subtitle={`Load avg (${cpus().length} cpus)`}
          onAction={openActivityMonitor}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
