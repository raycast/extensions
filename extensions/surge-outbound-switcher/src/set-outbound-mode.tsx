import { ActionPanel, Action, List, showToast, Toast, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { getCurrentSurgeOutboundMode, setSurgeOutboundMode, isSurgeRunning } from "./utils";

type Mode = "Direct" | "Global" | "Rule";

interface ModeItem {
  id: Mode;
  title: string;
  description: string;
  isCurrent: boolean;
  icon?: Icon | { source: Icon; tintColor: string };
}

export default function Command() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [modes, setModes] = useState<ModeItem[]>([]);
  const [surgeRunning, setSurgeRunning] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Create refresh function
  const refreshCurrentMode = async () => {
    setIsLoading(true);
    // Trigger reload
    setRefreshTrigger((prev) => prev + 1);
  };

  // Initialize and load mode list
  useEffect(() => {
    async function initialize() {
      try {
        // Check if Surge is running
        const running = await isSurgeRunning();
        setSurgeRunning(running);

        if (!running) {
          setIsLoading(false);
          await showToast({
            style: Toast.Style.Failure,
            title: "Surge is not running",
            message: "Please start Surge application first",
          });
          return;
        }

        // Get last used mode
        const storedMode = await getCurrentSurgeOutboundMode();
        console.log("Current stored mode:", storedMode);

        // Set available mode list
        const modesData: ModeItem[] = [
          {
            id: "Direct",
            title: "Direct Outbound",
            description: "All requests will be sent to the target server directly",
            isCurrent: storedMode === "Direct",
            icon: { source: Icon.CircleDisabled, tintColor: "#7F7F7F" },
          },
          {
            id: "Global",
            title: "Global Proxy",
            description: "All requests will be forwarded to a proxy server",
            isCurrent: storedMode === "Global",
            icon: { source: Icon.Globe, tintColor: "#1FE050" },
          },
          {
            id: "Rule",
            title: "Rule-Based Proxy",
            description: "Using rule system to determine how to process requests",
            isCurrent: storedMode === "Rule",
            icon: { source: Icon.BullsEye, tintColor: "#007aff" },
          },
        ];

        setModes(modesData);
      } catch (error) {
        console.error("Initialization error:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Loading failed",
          message: String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }

    initialize();
  }, [refreshTrigger]);

  // Handle mode setting
  const handleSetMode = async (mode: Mode) => {
    try {
      // Check if already in current mode
      const currentMode = modes.find((item) => item.isCurrent);
      if (currentMode && currentMode.id === mode) {
        await showToast({
          style: Toast.Style.Success,
          title: `Already in ${modes.find((item) => item.id === mode)?.title} mode`,
        });
        return;
      }

      setIsLoading(true);
      await setSurgeOutboundMode(mode);

      // Update mode list, mark the current selected mode
      setModes(
        modes.map((item) => ({
          ...item,
          isCurrent: item.id === mode,
        })),
      );

      setIsLoading(false);
    } catch (error) {
      console.error("Mode setting error:", error);
      setIsLoading(false);
    }
  };

  if (!surgeRunning) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView
          title="Surge is not running"
          description="Please start Surge application first"
          actions={
            <ActionPanel>
              <Action title="Refresh" onAction={refreshCurrentMode} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Select outbound mode...">
      {modes.map((mode) => (
        <List.Item
          key={mode.id}
          title={mode.title}
          subtitle={mode.description}
          icon={mode.icon}
          accessories={mode.isCurrent ? [{ icon: Icon.Checkmark }] : []}
          actions={
            <ActionPanel>
              <Action title={`Set to ${mode.title}`} onAction={() => handleSetMode(mode.id)} />
              <Action title="Refresh" shortcut={{ modifiers: ["cmd"], key: "r" }} onAction={refreshCurrentMode} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
