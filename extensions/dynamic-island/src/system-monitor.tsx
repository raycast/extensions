import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  getIslandStatus,
  IslandStatus,
  sendSocketCommand,
  setMetricVisibility,
  startDaemonIfNotRunning,
} from "./lib/ipc";

export default function SystemMonitor() {
  const [status, setStatus] = useState<IslandStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchMetrics = async () => {
    try {
      const s = await getIslandStatus();
      setStatus(s);
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleShowOnNotch = async () => {
    try {
      await startDaemonIfNotRunning();
      await sendSocketCommand({ action: "expand", widget: "system" });
      await showToast({
        style: Toast.Style.Success,
        title: "Showing System Stats on Notch",
      });
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to show stats on notch",
      });
    }
  };

  const sys = status?.system;
  const cpuVal = sys?.cpuPercent ?? 0;
  const ramVal = sys?.ramPercent ?? 0;
  const batVal = sys?.batteryPercent ?? 100;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search system telemetry & customization options..."
    >
      <List.Section title="Live Hardware Dashboard">
        <List.Item
          icon={{
            source: Icon.ComputerChip,
            tintColor: cpuVal > 80 ? Color.Red : Color.Blue,
          }}
          title="CPU Processor"
          subtitle={`${cpuVal.toFixed(1)}% Utilization`}
          accessories={[
            {
              text:
                cpuVal > 80
                  ? "Heavy Load"
                  : cpuVal > 40
                    ? "Moderate Load"
                    : "Optimal",
              icon: {
                source: cpuVal > 80 ? Icon.Exclamationmark : Icon.Check,
                tintColor: cpuVal > 80 ? Color.Red : Color.Green,
              },
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Show on Notch Island"
                icon={Icon.Eye}
                onAction={handleShowOnNotch}
              />
              <Action
                title="Toggle Cpu Card on Notch"
                icon={Icon.Switch}
                onAction={async () => {
                  await setMetricVisibility("CPU", true);
                  await showToast({
                    style: Toast.Style.Success,
                    title: "CPU Metric Enabled on Notch",
                  });
                }}
              />
            </ActionPanel>
          }
        />

        <List.Item
          icon={{
            source: Icon.MemoryChip,
            tintColor: ramVal > 85 ? Color.Red : Color.Purple,
          }}
          title="System Memory (RAM)"
          subtitle={`${ramVal.toFixed(1)}% Consumed`}
          accessories={[
            {
              text: ramVal > 85 ? "High Memory Pressure" : "Adequate Memory",
              icon: {
                source: ramVal > 85 ? Icon.Exclamationmark : Icon.Check,
                tintColor: ramVal > 85 ? Color.Orange : Color.Green,
              },
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Show on Notch Island"
                icon={Icon.Eye}
                onAction={handleShowOnNotch}
              />
              <Action
                title="Toggle Memory Card on Notch"
                icon={Icon.Switch}
                onAction={async () => {
                  await setMetricVisibility("Memory", true);
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Memory Metric Enabled on Notch",
                  });
                }}
              />
            </ActionPanel>
          }
        />

        <List.Item
          icon={{
            source: sys?.isCharging ? Icon.BatteryCharging : Icon.Battery,
            tintColor: batVal <= 20 ? Color.Red : Color.Green,
          }}
          title="Battery Health & Power"
          subtitle={`${batVal}% (${sys?.isCharging ? "Charging" : "Discharging"})`}
          accessories={[
            {
              text: sys?.isCharging ? "AC Adapter Connected" : "Battery Power",
              icon: {
                source: sys?.isCharging ? Icon.Bolt : Icon.Dot,
                tintColor: sys?.isCharging ? Color.Green : Color.SecondaryText,
              },
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Show on Notch Island"
                icon={Icon.Eye}
                onAction={handleShowOnNotch}
              />
              <Action
                title="Toggle Battery Card on Notch"
                icon={Icon.Switch}
                onAction={async () => {
                  await setMetricVisibility("Battery", true);
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Battery Metric Enabled on Notch",
                  });
                }}
              />
            </ActionPanel>
          }
        />

        <List.Item
          icon={{
            source: Icon.Network,
            tintColor: Color.Orange,
          }}
          title="Network Bandwidth"
          subtitle="Real-time live throughput"
          accessories={[
            {
              text: "Monitoring Active",
              icon: {
                source: Icon.Check,
                tintColor: Color.Green,
              },
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Show on Notch Island"
                icon={Icon.Eye}
                onAction={handleShowOnNotch}
              />
              <Action
                title="Toggle Network Card on Notch"
                icon={Icon.Switch}
                onAction={async () => {
                  await setMetricVisibility("Network", true);
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Network Metric Enabled on Notch",
                  });
                }}
              />
            </ActionPanel>
          }
        />

        <List.Item
          icon={{
            source: Icon.HardDrive,
            tintColor: Color.Blue,
          }}
          title="Storage (Macintosh HD)"
          subtitle="Internal SSD Volume"
          accessories={[
            {
              text: "Capacity Monitored",
              icon: {
                source: Icon.Check,
                tintColor: Color.Green,
              },
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Show on Notch Island"
                icon={Icon.Eye}
                onAction={handleShowOnNotch}
              />
              <Action
                title="Toggle Disk Card on Notch"
                icon={Icon.Switch}
                onAction={async () => {
                  await setMetricVisibility("Disk", true);
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Disk Metric Enabled on Notch",
                  });
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
