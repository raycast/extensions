import { Color, getPreferenceValues, Icon, MenuBarExtra } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { cpus, loadavg } from "os";

import { exec } from "child_process";
import { promisify } from "util";
import { BatteryState, BluetoothBatteryDevice, getBatteryState, getBluetoothBatteryDevices } from "./BatteryState";
import { calculateCPUUsage, CPUStats, getCPUStats } from "./CPUStats";
import { getScreenState, ScreenTimeState } from "./screenOn";
import { openActivityMonitor, openBatterySettings, openScreenTimeSettings } from "./utils";

export const execp = promisify(exec);

type SystemState = {
  battery: BatteryState;
  bluetooth: BluetoothBatteryDevice[];
  cpu: CPUStats;
  screen: ScreenTimeState;
  time: number;
};

const cacheKey = "SystemState-V3";

function getDeviceSubtitle(device: BluetoothBatteryDevice): string {
  if (device.batteryLevel != null) return `${device.batteryLevel}%`;
  if (device.batteryLeft != null && device.batteryRight != null) {
    return `L ${device.batteryLeft}% • R ${device.batteryRight}%${
      device.batteryCase != null ? ` • Case ${device.batteryCase}%` : ""
    }`;
  }
  if (device.batteryLeft != null) {
    return `L ${device.batteryLeft}%${device.batteryCase != null ? ` • Case ${device.batteryCase}%` : ""}`;
  }
  if (device.batteryRight != null) {
    return `R ${device.batteryRight}%${device.batteryCase != null ? ` • Case ${device.batteryCase}%` : ""}`;
  }
  if (device.batteryCase != null) return `Case ${device.batteryCase}%`;
  if (!device.isConnected) return "Not connected";
  return "Unavailable";
}

function getDeviceIcon(device: BluetoothBatteryDevice): Icon {
  const lowerName = device.name.toLowerCase();
  const lowerType = device.type.toLowerCase();
  if (lowerName.includes("airpods") || lowerType.includes("head")) return Icon.Headphones;
  if (lowerName.includes("iphone")) return Icon.Mobile;
  if (lowerName.includes("ipad")) return Icon.Monitor;
  if (lowerName.includes("watch")) return Icon.Clock;
  if (lowerType.includes("mouse")) return Icon.Mouse;
  if (lowerType.includes("keyboard")) return Icon.Keyboard;
  return Icon.Bluetooth;
}

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
    const [battery, bluetooth] = await Promise.all([getBatteryState(), getBluetoothBatteryDevices()]);
    const cpu = getCPUStats();
    const screen = getScreenState();
    return { battery, bluetooth, cpu, screen, time: Date.now() };
  };

  // periodically call getStats and update the state
  const { isLoading: battIsLoading } = useCachedPromise(getStats, [], {
    onData(data) {
      if (!stats || (stats.prev && stats.prev.time < Date.now() - 5 * 60 * 1000)) {
        setBattState({ prev: null, next: data, latest: data });
      } else if (stats.next.time < Date.now() - 60 * 1000 || stats.next.battery.watts !== data.battery.watts) {
        setBattState({ prev: stats.next, next: data, latest: data });
      } else {
        setBattState({ prev: stats.prev, next: stats.next, latest: data });
      }
    },
  });

  const wattDiff =
    stats?.prev?.battery?.watts != null &&
    stats.latest.battery.watts != null &&
    stats.prev.battery.chargingStatus === stats.latest.battery.chargingStatus
      ? Math.round((stats.latest.battery.watts - stats.prev.battery.watts) * 10) / 10
      : null;

  const latestBattery = stats?.latest?.battery;
  const timeRemaining =
    latestBattery && latestBattery.hoursRemaining != null
      ? `${latestBattery.hoursRemaining}:${String(latestBattery.minutesRemaining).padStart(2, "0")}`
      : null;

  const cpuUsage = stats?.prev?.cpu && stats.latest.cpu ? calculateCPUUsage(stats.prev.cpu, stats.latest.cpu) : null;

  const screenTime = stats?.prev?.screen && stats.latest.screen ? stats.latest.screen : null;

  const batteryColor = !stats
    ? undefined
    : latestBattery?.chargingStatus === "fully charged" || latestBattery?.chargingStatus === "on hold"
      ? Color.Green
      : latestBattery?.chargingStatus === "charging"
        ? Color.Blue
        : latestBattery?.capacity != null && latestBattery.capacity < 0.1
          ? Color.Red
          : latestBattery?.capacity != null && latestBattery.capacity < 0.2
            ? Color.Orange
            : latestBattery?.capacity != null && latestBattery.capacity < 0.3
              ? Color.Yellow
              : undefined;

  const remainingColor =
    !stats || latestBattery?.chargingStatus === "charging"
      ? undefined
      : latestBattery?.timeRemaining == null
        ? Color.SecondaryText
        : latestBattery.timeRemaining < (Number(preferences.remainingRed) || 0) * 60
          ? Color.Red
          : latestBattery.timeRemaining < (Number(preferences.remainingOrange) || 0) * 60
            ? Color.Orange
            : latestBattery.timeRemaining < (Number(preferences.remainingYellow) || 0) * 60
              ? Color.Yellow
              : undefined;

  const powerColor =
    !stats || latestBattery?.chargingStatus === "charging" || latestBattery?.watts == null
      ? undefined
      : -latestBattery.watts > (Number(preferences.highPowerUsage) || 500)
        ? Color.Purple
        : undefined;

  const iconColor = !stats
    ? Color.SecondaryText
    : powerColor
      ? powerColor
      : latestBattery?.chargingStatus === "fully charged" || latestBattery?.chargingStatus === "on hold"
        ? Color.Green
        : latestBattery?.chargingStatus === "charging"
          ? Color.Blue
          : batteryColor
            ? batteryColor
            : remainingColor
              ? remainingColor
              : undefined;

  const battPct = latestBattery?.capacity != null ? Math.round(latestBattery.capacity * 100) : null;
  const bluetoothDevices = stats?.latest.bluetooth ?? [];

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
            ? latestBattery?.watts != null
              ? `${Math.round(latestBattery.watts * 10) / 10}W`
              : "--W"
            : preferences.showInfo === "percent"
              ? "%"
              : ""
      }
    >
      <MenuBarExtra.Section title="Battery">
        {latestBattery ? (
          <>
            <MenuBarExtra.Item
              icon={{
                source: latestBattery.connected ? Icon.BatteryCharging : Icon.Battery,
                tintColor: batteryColor,
              }}
              subtitle={
                latestBattery.chargingStatus === "fully charged"
                  ? "Fully Charged"
                  : latestBattery.chargingStatus === "on hold"
                    ? "Charging on Hold"
                    : latestBattery.chargingStatus === "charging"
                      ? "Charging"
                      : latestBattery.chargingStatus === "discharging"
                        ? "Discharging"
                        : "Unknown"
              }
              title={latestBattery.capacity != null ? `${Math.round(latestBattery.capacity * 100)}%` : "--%"}
              onAction={openBatterySettings}
            />
            <MenuBarExtra.Item
              icon={{ source: Icon.Clock, tintColor: remainingColor }}
              title={timeRemaining || "--:--"}
              subtitle={latestBattery.chargingStatus === "charging" ? "Time until charged" : "Time remaining"}
              onAction={openBatterySettings}
            />
            <MenuBarExtra.Item
              icon={{ source: Icon.Bolt, tintColor: latestBattery.lowPowerMode ? Color.Yellow : undefined }}
              title={latestBattery.lowPowerMode ? "On" : "Off"}
              subtitle={"Low Power Mode"}
              onAction={openBatterySettings}
            />
            <MenuBarExtra.Item
              icon={{ source: Icon.Check, tintColor: iconColor }}
              title={latestBattery.health != null ? `${latestBattery.health.toFixed(2)}%` : "--"}
              subtitle={"Battery health"}
              onAction={openBatterySettings}
            />
            <MenuBarExtra.Item
              icon={{ source: Icon.RotateAntiClockwise, tintColor: iconColor }}
              title={latestBattery.cycles != null ? latestBattery.cycles.toFixed(0) : "--"}
              subtitle={"Battery cycles"}
              onAction={openBatterySettings}
            />
            <MenuBarExtra.Item
              icon={{
                source: Icon.Bolt,
                tintColor: powerColor,
              }}
              title={latestBattery.watts != null ? `${Math.round(Math.abs(latestBattery.watts))}W` : "--"}
              subtitle={latestBattery.chargingStatus === "charging" ? "Power input (~1 min)" : "Power draw (~1 min)"}
              onAction={openBatterySettings}
            />

            {latestBattery.chargingStatus === "discharging" && wattDiff ? (
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
      {bluetoothDevices.length > 0 ? (
        <MenuBarExtra.Section title="Devices">
          {bluetoothDevices.map((device) => (
            <MenuBarExtra.Item
              key={device.address}
              icon={{
                source: getDeviceIcon(device),
                tintColor: device.isConnected ? Color.Green : Color.SecondaryText,
              }}
              title={device.name}
              subtitle={getDeviceSubtitle(device)}
            />
          ))}
        </MenuBarExtra.Section>
      ) : null}

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
