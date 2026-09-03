import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  Keyboard,
  List,
  LocalStorage,
  showToast,
  Toast,
} from "@raycast/api";
import { execSync } from "child_process";
import { useState, useEffect } from "react";

interface Simulator {
  udid: string;
  name: string;
  state: string;
  runtime: string;
  isAvailable: boolean;
  deviceType: string;
  lastUsed?: number;
}

interface RawDevice {
  udid?: string;
  name?: string;
  state?: string;
  isAvailable?: boolean;
  deviceTypeIdentifier?: string;
}

const RECENT_SIMULATORS_KEY = "recent_simulators_history_v1";

export default function Command() {
  const [simulators, setSimulators] = useState<Simulator[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchSimulators = async () => {
    setIsLoading(true);
    try {
      const historyRaw = await LocalStorage.getItem<string>(RECENT_SIMULATORS_KEY);
      const historyMap: Record<string, number> = historyRaw ? JSON.parse(historyRaw) : {};

      const stdout = execSync("xcrun simctl list devices available --json").toString();
      const data = JSON.parse(stdout);
      const list: Simulator[] = [];

      for (const runtimeKey in data.devices) {
        if (runtimeKey.includes("iOS") || runtimeKey.includes("watchOS") || runtimeKey.includes("tvOS")) {
          const rawRuntime = runtimeKey.split(".").pop() || "Unknown OS";
          const runtimeName = rawRuntime.replace("iOS-", "iOS ").replace(/-/g, ".");

          data.devices[runtimeKey].forEach((dev: RawDevice) => {
            if (dev.isAvailable) {
              const udid = dev.udid || "N/A";
              list.push({
                udid,
                name: dev.name || "Unnamed Device",
                state: dev.state || "Shutdown",
                runtime: runtimeName,
                isAvailable: dev.isAvailable,
                deviceType: dev.deviceTypeIdentifier || "Apple Device",
                lastUsed: historyMap[udid] || 0,
              });
            }
          });
        }
      }

      setSimulators(list);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error loading simulators",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSimulators();
  }, []);

  const trackUsage = async (udid: string) => {
    try {
      const historyRaw = await LocalStorage.getItem<string>(RECENT_SIMULATORS_KEY);
      const historyMap: Record<string, number> = historyRaw ? JSON.parse(historyRaw) : {};
      historyMap[udid] = Date.now();
      await LocalStorage.setItem(RECENT_SIMULATORS_KEY, JSON.stringify(historyMap));
    } catch {
      showToast({ style: Toast.Style.Failure, title: "Failed to update recent simulators history" });
    }
  };

  const bootSimulator = async (sim: Simulator) => {
    try {
      execSync(`xcrun simctl boot ${sim.udid}`);
      execSync("open -a Simulator");
      await trackUsage(sim.udid);
      showToast({ style: Toast.Style.Success, title: `Booted ${sim.name}` });
      fetchSimulators();
    } catch {
      showToast({ style: Toast.Style.Failure, title: "Failed to boot simulator" });
    }
  };

  const shutdownSimulator = async (sim: Simulator) => {
    try {
      execSync(`xcrun simctl shutdown ${sim.udid}`);
      await trackUsage(sim.udid);
      showToast({ style: Toast.Style.Success, title: `Shutdown ${sim.name}` });
      fetchSimulators();
    } catch {
      showToast({ style: Toast.Style.Failure, title: "Failed to shutdown simulator" });
    }
  };

  const toggleAppearance = async (sim: Simulator) => {
    try {
      const stdout = execSync(`xcrun simctl ui ${sim.udid} appearance`).toString().trim();
      const newMode = stdout.toLowerCase().includes("dark") ? "light" : "dark";

      execSync(`xcrun simctl ui ${sim.udid} appearance ${newMode}`);
      await trackUsage(sim.udid);

      showToast({
        style: Toast.Style.Success,
        title: `Switched to ${newMode.toUpperCase()} mode`,
      });
      fetchSimulators();
    } catch {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to toggle appearance (Is device booted?)",
      });
    }
  };

  const eraseSimulator = async (sim: Simulator) => {
    const confirmed = await confirmAlert({
      title: `Erase ${sim.name}?`,
      message: "Apps, settings and user data on this simulator will be permanently erased.",
      primaryAction: { title: "Erase Simulator", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    try {
      execSync(`xcrun simctl erase ${sim.udid}`);
      showToast({ style: Toast.Style.Success, title: `Erased ${sim.name}` });
      fetchSimulators();
    } catch {
      showToast({ style: Toast.Style.Failure, title: "Failed to erase (Shutdown first)" });
    }
  };

  const recentSimulators = simulators
    .filter((s) => s.lastUsed && s.lastUsed > 0)
    .sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0));

  const allOtherSimulators = simulators
    .filter((s) => !s.lastUsed || s.lastUsed === 0)
    .sort((a, b) => {
      const aBooted = a.state.toLowerCase().includes("boot");
      const bBooted = b.state.toLowerCase().includes("boot");
      if (aBooted && !bBooted) return -1;
      if (!aBooted && bBooted) return 1;
      return a.name.localeCompare(b.name);
    });

  const renderItem = (sim: Simulator) => {
    const isBooted = sim.state.toLowerCase().includes("boot");

    return (
      <List.Item
        key={sim.udid}
        title={sim.name}
        icon={isBooted ? { source: Icon.Mobile, tintColor: Color.Green } : Icon.Mobile}
        keywords={[sim.runtime, sim.udid]}
        detail={
          <List.Item.Detail
            markdown={`# ${sim.name}\n\n**Status:** ${
              isBooted ? "🟢 Booted" : "🔴 Shutdown"
            }\n\n---\n\n* **OS Version:** ${sim.runtime}\n* **UDID:** \`${sim.udid}\``}
          />
        }
        actions={
          <ActionPanel>
            <ActionPanel.Section title="Simulator Actions">
              {!isBooted ? (
                <Action title="Boot Simulator" icon={Icon.Play} onAction={() => bootSimulator(sim)} />
              ) : (
                <>
                  <Action
                    title="Toggle Dark/Light Mode"
                    icon={Icon.Moon}
                    shortcut={{ modifiers: ["cmd"], key: "t" }}
                    onAction={() => toggleAppearance(sim)}
                  />
                  <Action
                    title="Shutdown Simulator"
                    icon={Icon.Stop}
                    shortcut={Keyboard.Shortcut.Common.Save}
                    onAction={() => shutdownSimulator(sim)}
                  />
                </>
              )}
            </ActionPanel.Section>
            <ActionPanel.Section title="Management">
              <Action
                title="Erase Content & Settings"
                icon={Icon.Trash}
                shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                onAction={() => eraseSimulator(sim)}
              />
              <Action
                title="Refresh List"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={fetchSimulators}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search simulator..." isShowingDetail>
      {recentSimulators.length > 0 && (
        <List.Section title="Recently Used">{recentSimulators.map(renderItem)}</List.Section>
      )}

      <List.Section title={recentSimulators.length > 0 ? "All Simulators" : "Simulators"}>
        {allOtherSimulators.map(renderItem)}
      </List.Section>
    </List>
  );
}
