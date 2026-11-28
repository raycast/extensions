import { Action, ActionPanel, Color, Icon, List, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import { useEffect, useState } from "react";
import { promisify } from "util";
import {
  DEFAULTS_DOMAIN,
  getIslandStatus,
  isDaemonRunning,
  IslandStatus,
  sendSocketCommand,
  setMetricVisibility,
  setWidgetVisibility,
  startDaemonIfNotRunning,
  stopDaemon,
} from "./lib/ipc";

const execAsync = promisify(exec);

export default function IslandSettings() {
  const [isRunning, setIsRunning] = useState<boolean | null>(null);
  const [status, setStatus] = useState<IslandStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [menuConfig, setMenuConfig] = useState({
    media: true,
    mixer: true,
    system: true,
    timer: true,
    calendar: true,
  });
  const [metricConfig, setMetricConfig] = useState({
    CPU: true,
    GPU: true,
    Memory: true,
    Battery: true,
    Network: true,
    Disk: true,
  });

  const loadDefaults = async () => {
    try {
      const { stdout: mediaOut } = await execAsync(
        `defaults read ${DEFAULTS_DOMAIN} showMediaWidget 2>/dev/null || echo 1`,
      );
      const { stdout: mixerOut } = await execAsync(
        `defaults read ${DEFAULTS_DOMAIN} showMixerWidget 2>/dev/null || echo 1`,
      );
      const { stdout: systemOut } = await execAsync(
        `defaults read ${DEFAULTS_DOMAIN} showSystemWidget 2>/dev/null || echo 1`,
      );
      const { stdout: timerOut } = await execAsync(
        `defaults read ${DEFAULTS_DOMAIN} showTimerWidget 2>/dev/null || echo 1`,
      );
      const { stdout: calendarOut } = await execAsync(
        `defaults read ${DEFAULTS_DOMAIN} showCalendarWidget 2>/dev/null || echo 1`,
      );

      const { stdout: cpuOut } = await execAsync(
        `defaults read ${DEFAULTS_DOMAIN} showMetricCPU 2>/dev/null || echo 1`,
      );
      const { stdout: gpuOut } = await execAsync(
        `defaults read ${DEFAULTS_DOMAIN} showMetricGPU 2>/dev/null || echo 1`,
      );
      const { stdout: memOut } = await execAsync(
        `defaults read ${DEFAULTS_DOMAIN} showMetricMemory 2>/dev/null || echo 1`,
      );
      const { stdout: batOut } = await execAsync(
        `defaults read ${DEFAULTS_DOMAIN} showMetricBattery 2>/dev/null || echo 1`,
      );
      const { stdout: netOut } = await execAsync(
        `defaults read ${DEFAULTS_DOMAIN} showMetricNetwork 2>/dev/null || echo 1`,
      );
      const { stdout: diskOut } = await execAsync(
        `defaults read ${DEFAULTS_DOMAIN} showMetricDisk 2>/dev/null || echo 1`,
      );

      setMenuConfig({
        media: mediaOut.trim() !== "0",
        mixer: mixerOut.trim() !== "0",
        system: systemOut.trim() !== "0",
        timer: timerOut.trim() !== "0",
        calendar: calendarOut.trim() !== "0",
      });

      setMetricConfig({
        CPU: cpuOut.trim() !== "0",
        GPU: gpuOut.trim() !== "0",
        Memory: memOut.trim() !== "0",
        Battery: batOut.trim() !== "0",
        Network: netOut.trim() !== "0",
        Disk: diskOut.trim() !== "0",
      });
    } catch {
      // Keep defaults
    }
  };

  const refreshStatus = async () => {
    setIsLoading(true);
    try {
      const running = await isDaemonRunning();
      setIsRunning(running);
      if (running) {
        const s = await getIslandStatus();
        setStatus(s);
      } else {
        setStatus(null);
      }
    } catch {
      setIsRunning(false);
      setStatus(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDefaults();
    refreshStatus();
    const interval = setInterval(refreshStatus, 2500);
    return () => clearInterval(interval);
  }, []);

  const handleStartDaemon = async () => {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Starting Dynamic Island...",
      });
      await startDaemonIfNotRunning();
      await refreshStatus();
      await showToast({
        style: Toast.Style.Success,
        title: "Dynamic Island Active",
      });
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to start island",
        message: String(err),
      });
    }
  };

  const handleStopDaemon = async () => {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Stopping Dynamic Island...",
      });
      await stopDaemon();
      await refreshStatus();
      await showToast({
        style: Toast.Style.Success,
        title: "Dynamic Island Stopped",
      });
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to stop island",
        message: String(err),
      });
    }
  };

  const handleToggle = async () => {
    try {
      await sendSocketCommand({ action: "toggle" });
      await refreshStatus();
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to toggle island",
      });
    }
  };

  const handleToggleWidget = async (widget: "media" | "mixer" | "system" | "timer" | "calendar") => {
    const nextVal = !menuConfig[widget];
    setMenuConfig((prev) => ({ ...prev, [widget]: nextVal }));
    await setWidgetVisibility(widget, nextVal);
    await showToast({
      style: Toast.Style.Success,
      title: `${widget.charAt(0).toUpperCase() + widget.slice(1)} Widget ${nextVal ? "Enabled" : "Disabled"}`,
    });
  };

  const handleToggleMetric = async (metric: "CPU" | "GPU" | "Memory" | "Battery" | "Network" | "Disk") => {
    const nextVal = !metricConfig[metric];
    setMetricConfig((prev) => ({ ...prev, [metric]: nextVal }));
    await setMetricVisibility(metric, nextVal);
    await showToast({
      style: Toast.Style.Success,
      title: `${metric} Metric Card ${nextVal ? "Enabled" : "Hidden"}`,
    });
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search settings and customization options...">
      <List.Section title="Dynamic Island Service Status">
        <List.Item
          icon={{
            source: isRunning ? Icon.CheckCircle : Icon.XMarkCircle,
            tintColor: isRunning ? Color.Green : Color.Red,
          }}
          title="Engine Status"
          subtitle={
            isRunning
              ? status?.isExpanded
                ? "Active (Currently Expanded on Notch)"
                : "Active (Idle / Hover Ready)"
              : "Not Running"
          }
          accessories={[
            {
              text: isRunning ? "Running" : "Stopped",
              icon: {
                source: isRunning ? Icon.Dot : Icon.Circle,
                tintColor: isRunning ? Color.Green : Color.Red,
              },
            },
          ]}
          actions={
            <ActionPanel>
              {isRunning ? (
                <>
                  <Action title="Toggle Expand / Collapse" icon={Icon.Switch} onAction={handleToggle} />
                  <Action
                    title="Stop Island Service"
                    icon={Icon.Stop}
                    style={Action.Style.Destructive}
                    onAction={handleStopDaemon}
                  />
                </>
              ) : (
                <Action title="Start Island Service" icon={Icon.Play} onAction={handleStartDaemon} />
              )}
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />

        <List.Item
          icon={{
            source: Icon.Monitor,
            tintColor: status?.hasHardwareNotch ? Color.Green : Color.Blue,
          }}
          title="Hardware Display Mode"
          subtitle={
            status?.hasHardwareNotch
              ? `MacBook Hardware Camera Notch (${Math.round(status.notchWidth)}pt × ${Math.round(status.notchHeight)}pt)`
              : "External Monitor / Pill Silhouette"
          }
          accessories={[
            {
              text: status?.hasHardwareNotch ? "Physical Notch" : "Pill Overlay",
            },
          ]}
        />
      </List.Section>

      <List.Section title="System UI Customization (Notch Hardware Cards)">
        <List.Item
          icon={{
            source: Icon.ComputerChip,
            tintColor: metricConfig.CPU ? Color.Blue : Color.SecondaryText,
          }}
          title="CPU Utilization Card"
          subtitle="Real-time processor utilization percentage and active core load"
          accessories={[
            {
              text: metricConfig.CPU ? "Visible on Notch" : "Hidden",
              icon: {
                source: metricConfig.CPU ? Icon.Check : Icon.Minus,
                tintColor: metricConfig.CPU ? Color.Green : Color.SecondaryText,
              },
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title={metricConfig.CPU ? "Hide from System Ui" : "Show in System Ui"}
                icon={metricConfig.CPU ? Icon.EyeDisabled : Icon.Eye}
                onAction={() => handleToggleMetric("CPU")}
              />
            </ActionPanel>
          }
        />

        <List.Item
          icon={{
            source: Icon.MemoryChip,
            tintColor: metricConfig.Memory ? Color.Purple : Color.SecondaryText,
          }}
          title="Memory (RAM) Usage Card"
          subtitle="Live RAM usage ratio and memory consumption meter"
          accessories={[
            {
              text: metricConfig.Memory ? "Visible on Notch" : "Hidden",
              icon: {
                source: metricConfig.Memory ? Icon.Check : Icon.Minus,
                tintColor: metricConfig.Memory ? Color.Green : Color.SecondaryText,
              },
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title={metricConfig.Memory ? "Hide from System Ui" : "Show in System Ui"}
                icon={metricConfig.Memory ? Icon.EyeDisabled : Icon.Eye}
                onAction={() => handleToggleMetric("Memory")}
              />
            </ActionPanel>
          }
        />

        <List.Item
          icon={{
            source: Icon.BatteryCharging,
            tintColor: metricConfig.Battery ? Color.Green : Color.SecondaryText,
          }}
          title="Battery & Power Status Card"
          subtitle="Battery charge level, power adapter connection, and charging indicator"
          accessories={[
            {
              text: metricConfig.Battery ? "Visible on Notch" : "Hidden",
              icon: {
                source: metricConfig.Battery ? Icon.Check : Icon.Minus,
                tintColor: metricConfig.Battery ? Color.Green : Color.SecondaryText,
              },
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title={metricConfig.Battery ? "Hide from System Ui" : "Show in System Ui"}
                icon={metricConfig.Battery ? Icon.EyeDisabled : Icon.Eye}
                onAction={() => handleToggleMetric("Battery")}
              />
            </ActionPanel>
          }
        />

        <List.Item
          icon={{
            source: Icon.Network,
            tintColor: metricConfig.Network ? Color.Orange : Color.SecondaryText,
          }}
          title="Network Bandwidth Card"
          subtitle="Live download and upload transfer rates"
          accessories={[
            {
              text: metricConfig.Network ? "Visible on Notch" : "Hidden",
              icon: {
                source: metricConfig.Network ? Icon.Check : Icon.Minus,
                tintColor: metricConfig.Network ? Color.Green : Color.SecondaryText,
              },
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title={metricConfig.Network ? "Hide from System Ui" : "Show in System Ui"}
                icon={metricConfig.Network ? Icon.EyeDisabled : Icon.Eye}
                onAction={() => handleToggleMetric("Network")}
              />
            </ActionPanel>
          }
        />

        <List.Item
          icon={{
            source: Icon.HardDrive,
            tintColor: metricConfig.Disk ? Color.Blue : Color.SecondaryText,
          }}
          title="Disk Storage Card"
          subtitle="Internal SSD available storage and space capacity meter"
          accessories={[
            {
              text: metricConfig.Disk ? "Visible on Notch" : "Hidden",
              icon: {
                source: metricConfig.Disk ? Icon.Check : Icon.Minus,
                tintColor: metricConfig.Disk ? Color.Green : Color.SecondaryText,
              },
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title={metricConfig.Disk ? "Hide from System Ui" : "Show in System Ui"}
                icon={metricConfig.Disk ? Icon.EyeDisabled : Icon.Eye}
                onAction={() => handleToggleMetric("Disk")}
              />
            </ActionPanel>
          }
        />

        <List.Item
          icon={{
            source: Icon.Box,
            tintColor: metricConfig.GPU ? Color.Magenta : Color.SecondaryText,
          }}
          title="GPU Utilization Card"
          subtitle="Graphics processor load and rendering activity"
          accessories={[
            {
              text: metricConfig.GPU ? "Visible on Notch" : "Hidden",
              icon: {
                source: metricConfig.GPU ? Icon.Check : Icon.Minus,
                tintColor: metricConfig.GPU ? Color.Green : Color.SecondaryText,
              },
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title={metricConfig.GPU ? "Hide from System Ui" : "Show in System Ui"}
                icon={metricConfig.GPU ? Icon.EyeDisabled : Icon.Eye}
                onAction={() => handleToggleMetric("GPU")}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Island Menu Widgets (Configure Visible Modules)">
        <List.Item
          icon={{
            source: Icon.Music,
            tintColor: menuConfig.media ? Color.Blue : Color.SecondaryText,
          }}
          title="Now Playing Media Player"
          subtitle="Display current track with timeline scrubber & transport controls"
          accessories={[
            {
              text: menuConfig.media ? "Visible in Menu" : "Hidden",
              icon: {
                source: menuConfig.media ? Icon.Check : Icon.Minus,
                tintColor: menuConfig.media ? Color.Green : Color.SecondaryText,
              },
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title={menuConfig.media ? "Hide from Menu" : "Show in Menu"}
                icon={menuConfig.media ? Icon.EyeDisabled : Icon.Eye}
                onAction={() => handleToggleWidget("media")}
              />
              <Action
                title="Show on Notch Island"
                icon={Icon.ChevronUp}
                onAction={async () => {
                  await sendSocketCommand({
                    action: "expand",
                    widget: "music",
                  });
                }}
              />
            </ActionPanel>
          }
        />

        <List.Item
          icon={{
            source: Icon.SpeakerHigh,
            tintColor: menuConfig.mixer ? Color.Orange : Color.SecondaryText,
          }}
          title="Volume Mixer"
          subtitle="Master system volume slider and per-app audio faders"
          accessories={[
            {
              text: menuConfig.mixer ? "Visible in Menu" : "Hidden",
              icon: {
                source: menuConfig.mixer ? Icon.Check : Icon.Minus,
                tintColor: menuConfig.mixer ? Color.Green : Color.SecondaryText,
              },
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title={menuConfig.mixer ? "Hide from Menu" : "Show in Menu"}
                icon={menuConfig.mixer ? Icon.EyeDisabled : Icon.Eye}
                onAction={() => handleToggleWidget("mixer")}
              />
              <Action
                title="Show on Notch Island"
                icon={Icon.ChevronUp}
                onAction={async () => {
                  await sendSocketCommand({
                    action: "expand",
                    widget: "mixer",
                  });
                }}
              />
            </ActionPanel>
          }
        />

        <List.Item
          icon={{
            source: Icon.Gauge,
            tintColor: menuConfig.system ? Color.Blue : Color.SecondaryText,
          }}
          title="System Telemetry Monitor"
          subtitle="Real-time CPU, RAM, Battery, and Network metrics cards"
          accessories={[
            {
              text: menuConfig.system ? "Visible in Menu" : "Hidden",
              icon: {
                source: menuConfig.system ? Icon.Check : Icon.Minus,
                tintColor: menuConfig.system ? Color.Green : Color.SecondaryText,
              },
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title={menuConfig.system ? "Hide from Menu" : "Show in Menu"}
                icon={menuConfig.system ? Icon.EyeDisabled : Icon.Eye}
                onAction={() => handleToggleWidget("system")}
              />
              <Action
                title="Show on Notch Island"
                icon={Icon.ChevronUp}
                onAction={async () => {
                  await sendSocketCommand({
                    action: "expand",
                    widget: "system",
                  });
                }}
              />
            </ActionPanel>
          }
        />

        <List.Item
          icon={{
            source: Icon.Clock,
            tintColor: menuConfig.timer ? Color.Green : Color.SecondaryText,
          }}
          title="Focus Timer"
          subtitle="Pomodoro focus countdown timer with live progress wheel"
          accessories={[
            {
              text: menuConfig.timer ? "Visible in Menu" : "Hidden",
              icon: {
                source: menuConfig.timer ? Icon.Check : Icon.Minus,
                tintColor: menuConfig.timer ? Color.Green : Color.SecondaryText,
              },
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title={menuConfig.timer ? "Hide from Menu" : "Show in Menu"}
                icon={menuConfig.timer ? Icon.EyeDisabled : Icon.Eye}
                onAction={() => handleToggleWidget("timer")}
              />
              <Action
                title="Show on Notch Island"
                icon={Icon.ChevronUp}
                onAction={async () => {
                  await sendSocketCommand({
                    action: "expand",
                    widget: "timer",
                  });
                }}
              />
            </ActionPanel>
          }
        />

        <List.Item
          icon={{
            source: Icon.Calendar,
            tintColor: menuConfig.calendar ? Color.Red : Color.SecondaryText,
          }}
          title="Calendar & Upcoming Agenda"
          subtitle="Week strip and upcoming calendar events"
          accessories={[
            {
              text: menuConfig.calendar ? "Visible in Menu" : "Hidden",
              icon: {
                source: menuConfig.calendar ? Icon.Check : Icon.Minus,
                tintColor: menuConfig.calendar ? Color.Green : Color.SecondaryText,
              },
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title={menuConfig.calendar ? "Hide from Menu" : "Show in Menu"}
                icon={menuConfig.calendar ? Icon.EyeDisabled : Icon.Eye}
                onAction={() => handleToggleWidget("calendar")}
              />
              <Action
                title="Show on Notch Island"
                icon={Icon.ChevronUp}
                onAction={async () => {
                  await sendSocketCommand({
                    action: "expand",
                    widget: "calendar",
                  });
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Raycast Preferences">
        <List.Item
          icon={{ source: Icon.Gear, tintColor: Color.Purple }}
          title="Open Extension Preferences"
          subtitle="Configure hover-to-expand, island style silhouette, and auto-hide timing"
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
