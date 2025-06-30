import { Color, getPreferenceValues, Icon, MenuBarExtra } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { cpus, loadavg } from "os";

import { exec } from "child_process";
import { promisify } from "util";
import { BatteryState, getBatteryState } from "./BatteryState";
import { calculateCPUUsage, CPUStats, getCPUStats } from "./CPUStats";
import { getScreenState, ScreenTimeState } from "./screenOn";
import { openActivityMonitor, openBatterySettings, openScreenTimeSettings } from "./utils";

export const execp = promisify(exec);

type SystemState = BatteryState & { cpu: CPUStats } & { screen: ScreenTimeState };

const cacheKey = "SystemState-V2";

export default function Command() {
  const preferences = getPreferenceValues();

  // define a useCachedState hook that store all states in cache
  const [stats, setBattState] = useCachedState<{
    prev: SystemState | null;
    next: SystemState;
    latest: SystemState;
  } | null>(cacheKey, null);

  // define a getStats function that call
  // 1. getBatteryState
  // 2. getCPUStats
  // 3. getScreenState
  const getStats = async () => {
    const battery = await getBatteryState();
    const cpu = getCPUStats();
    const screen = getScreenState();
    return { ...battery, cpu, screen };
  };

  // periodically call getStats and update the state
  const { isLoading: battIsLoading } = useCachedPromise(getStats, [], {
    onData(data) {
      if (!stats || (stats.prev && stats.prev.time < Date.now() - 5 * 60 * 1000)) {
        console.log("Resetting battery state", data);
        setBattState({ prev: null, next: data, latest: data });
      } else if (stats.next.time < Date.now() - 60 * 1000 || stats.next.watts !== data.watts) {
        console.log("Storing next battery state", data);
        setBattState({ prev: stats.next, next: data, latest: data });
      } else {
        console.log("Storing latest battery state", data);
        setBattState({ prev: stats.prev, next: stats.next, latest: data });
      }
    },
  });

  const wattDiff =
    stats?.prev?.watts && stats.latest.watts && stats.prev.charging === stats.latest.charging
      ? Math.round((stats.latest.watts - stats.prev.watts) * 10) / 10
      : null;

  const timeRemaining =
    stats && stats.latest.hoursRemaining != null
      ? `${stats.latest.hoursRemaining}:${String(stats.latest.minutesRemaining).padStart(2, "0")}`
      : null;

  const cpuUsage = stats?.prev?.cpu && stats.latest.cpu ? calculateCPUUsage(stats?.prev?.cpu, stats?.latest.cpu) : null;

  const screenTime = stats?.prev?.screen && stats.latest.screen ? stats.latest.screen : null;

  const batteryColor = !stats
    ? undefined
    : stats.latest.charging
    ? Color.Blue
    : stats.latest.capacity < 0.1
    ? Color.Red
    : stats.latest.capacity < 0.2
    ? Color.Orange
    : stats.latest.capacity < 0.3
    ? Color.Yellow
    : undefined;

  const remainingColor =
    !stats || stats.latest.charging
      ? undefined
      : stats.latest.timeRemaining == null
      ? Color.SecondaryText
      : stats.latest.timeRemaining < (Number(preferences.remainingRed) || 0) * 60
      ? Color.Red
      : stats.latest.timeRemaining < (Number(preferences.remainingOrange) || 0) * 60
      ? Color.Orange
      : stats.latest.timeRemaining < (Number(preferences.remainingYellow) || 0) * 60
      ? Color.Yellow
      : undefined;

  const powerColor =
    !stats || stats.latest.charging || !stats.latest.watts
      ? undefined
      : -stats.latest.watts > (Number(preferences.highPowerUsage) || 500)
      ? Color.Yellow
      : undefined;

  const iconColor = !stats
    ? Color.SecondaryText
    : stats.latest.charging && stats.latest.capacity == 1
    ? undefined
    : stats.latest.charging
    ? Color.Blue
    : remainingColor
    ? remainingColor
    : powerColor
    ? powerColor
    : undefined;

  const battPct = stats ? Math.round(stats?.latest.capacity * 100) : null;

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
        // getProgressIcon(stats?.latest.capacity ?? 0, iconColor)
      }
      isLoading={battIsLoading}
      title={
        preferences.showInfo === "remaining"
          ? timeRemaining || "--:--"
          : preferences.showInfo === "watts"
          ? stats?.latest.watts
            ? `${Math.round(stats.latest.watts * 10) / 10}W`
            : "--W"
          : preferences.showInfo === "percent"
          ? "%"
          : ""
      }
    >
      <MenuBarExtra.Section title="Battery">
        {stats?.latest ? (
          <>
            <MenuBarExtra.Item
              icon={{
                source: stats.latest.connected ? Icon.BatteryCharging : Icon.Battery,
                tintColor: batteryColor,
              }}
              subtitle={stats.latest.charging ? "Charging" : "Discharging"}
              title={`${Math.round(stats.latest.capacity * 100)}%`}
              onAction={openBatterySettings}
            />
            <MenuBarExtra.Item
              icon={{ source: Icon.Clock, tintColor: remainingColor }}
              title={timeRemaining || "--:--"}
              subtitle={stats.latest.charging ? "Time until charged" : "Time remaining"}
              onAction={openBatterySettings}
            />
            <MenuBarExtra.Item
              icon={{ source: Icon.Bolt, tintColor: stats.latest.lowPowerMode ? Color.Yellow : undefined }}
              title={stats.latest.lowPowerMode ? "On" : "Off"}
              subtitle={"Low Power Mode"}
              onAction={openBatterySettings}
            />
            <MenuBarExtra.Item
              icon={{ source: Icon.Check, tintColor: iconColor }}
              title={stats.latest.health.toFixed(2) + "%"}
              subtitle={"Battery health"}
              onAction={openBatterySettings}
            />
            <MenuBarExtra.Item
              icon={{ source: Icon.RotateAntiClockwise, tintColor: iconColor }}
              title={stats.latest.cycles.toFixed(0)}
              subtitle={"Battery cycles"}
              onAction={openBatterySettings}
            />
            <MenuBarExtra.Item
              icon={{
                source: Icon.Bolt,
                tintColor: powerColor,
              }}
              title={stats.latest.watts ? `${Math.round(Math.abs(stats.latest.watts))}W` : "--"}
              subtitle={stats.latest.charging ? "Power input (~1 min)" : "Power draw (~1 min)"}
              onAction={openBatterySettings}
            />

            {!stats.latest.charging && wattDiff ? (
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

      <MenuBarExtra.Section title="Screen">
        <MenuBarExtra.Item
          icon={Icon.Monitor}
          title={screenTime?.duration || "--:--"}
          subtitle="Screen Waking Time"
          onAction={openScreenTimeSettings}
        />
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
