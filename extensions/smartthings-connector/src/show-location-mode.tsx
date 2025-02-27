import { List, showToast, Toast, ActionPanel, Icon, Action, Color } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchCurrentLocationMode, fetchLocationModes, switchLocationMode } from "./fetchDevices";
import { LocationMode } from "./types";

export default function ShowLocationMode() {
  const [currentMode, setCurrentMode] = useState<LocationMode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [modes, setModes] = useState<LocationMode[]>([]);

  // Function to fetch and update current mode
  const updateCurrentMode = async () => {
    try {
      const currentModeData = await fetchCurrentLocationMode();
      // Log the response to see the structure
      console.log("Current mode data:", currentModeData);

      // Update how we handle the response based on the API structure
      if (currentModeData) {
        setCurrentMode({
          id: currentModeData.id,
          name: currentModeData.label || currentModeData.name,
        });
      }
    } catch (error) {
      console.error("Error fetching current mode:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch current mode",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  // Initial data fetch
  useEffect(() => {
    async function fetchData() {
      try {
        // First fetch current mode
        await updateCurrentMode();

        // Then fetch available modes
        const availableModes = await fetchLocationModes();
        if (Array.isArray(availableModes)) {
          console.log("Available modes:", availableModes);
          setModes(availableModes);
        }
      } catch (error) {
        console.error("Error in fetchData:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch data",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleSwitchMode = async (mode: LocationMode) => {
    try {
      setIsLoading(true);
      await switchLocationMode(mode.id);
      await updateCurrentMode(); // Fetch the updated mode after switching

      showToast({
        style: Toast.Style.Success,
        title: "Mode Changed",
        message: `Successfully switched to ${mode.name}`,
      });
    } catch (error) {
      console.error("Error switching mode:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to change mode",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getModeIcon = (mode: LocationMode) => {
    const isActive = currentMode?.id === mode.id;
    return {
      source: isActive ? Icon.CheckCircle : Icon.Circle,
      tintColor: isActive ? Color.Green : Color.SecondaryText,
    };
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search location modes...">
      {modes.map((mode) => (
        <List.Item
          key={mode.id}
          title={mode.name}
          icon={getModeIcon(mode)}
          actions={
            <ActionPanel>
              {currentMode?.id !== mode.id && (
                <Action
                  title={`Switch to ${mode.name}`}
                  onAction={() => handleSwitchMode(mode)}
                  icon={Icon.Switch}
                />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
