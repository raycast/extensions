import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  LocalStorage,
  getPreferenceValues,
  closeMainWindow,
  Icon,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { DisplayInfo, Preferences } from "./utils/types";
import { debugLog } from "./utils/debug";
import {
  getDisplays,
  getAvailableRefreshRates,
  getCurrentRefreshRate,
  changeRefreshRate,
  clearCache,
} from "./utils/display-manager";

// Get preferences
const preferences = getPreferenceValues<Preferences>();

/**
 * Main command entry point - Form UI
 */
export default function Command() {
  const [displays, setDisplays] = useState<DisplayInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDisplay, setSelectedDisplay] = useState<string>("0");
  const [selectedRefreshRate, setSelectedRefreshRate] = useState<string>("144");
  const [availableRates, setAvailableRates] = useState<number[]>([]);
  const [autoRevertEnabled, setAutoRevertEnabled] = useState<boolean>(preferences.autoRevert);
  const [revertTimeout, setRevertTimeout] = useState<string>(preferences.revertTimeout);
  const [autoCloseWindow, setAutoCloseWindow] = useState<boolean>(true);
  const [currentRate, setCurrentRate] = useState<number | null>(null);

  // Load displays on mount
  useEffect(() => {
    async function loadDisplays() {
      try {
        debugLog("Loading displays...");
        const displayList = await getDisplays();
        setDisplays(displayList);

        // Load last selected values from LocalStorage
        const lastDisplay = await LocalStorage.getItem<string>("lastSelectedDisplay");
        const lastRate = await LocalStorage.getItem<string>("lastSelectedRefreshRate");
        const lastAutoRevert = await LocalStorage.getItem<string>("lastAutoRevert");
        const lastRevertTimeout = await LocalStorage.getItem<string>("lastRevertTimeout");
        const lastAutoClose = await LocalStorage.getItem<string>("lastAutoClose");

        if (lastDisplay) {
          setSelectedDisplay(lastDisplay);
        }
        if (lastRate) {
          setSelectedRefreshRate(lastRate);
        }
        if (lastAutoRevert !== undefined) {
          setAutoRevertEnabled(lastAutoRevert === "true");
        }
        if (lastRevertTimeout) {
          setRevertTimeout(lastRevertTimeout);
        }
        if (lastAutoClose !== undefined) {
          setAutoCloseWindow(lastAutoClose === "true");
        }

        debugLog("Displays loaded:", displayList);
      } catch (error) {
        debugLog("Error loading displays:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load displays",
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadDisplays();
  }, []);

  // Load available refresh rates and current rate when display changes
  useEffect(() => {
    async function loadRefreshRates() {
      try {
        const displayIndex = parseInt(selectedDisplay, 10);

        // Load available rates
        const rates = await getAvailableRefreshRates(displayIndex);
        setAvailableRates(rates);
        debugLog(`Loaded refresh rates for display ${displayIndex}:`, rates);

        // Load current rate
        const current = await getCurrentRefreshRate(displayIndex);
        setCurrentRate(current);
        debugLog(`Current refresh rate for display ${displayIndex}:`, current);
      } catch (error) {
        debugLog("Error loading refresh rates:", error);
      }
    }

    if (selectedDisplay) {
      loadRefreshRates();
    }
  }, [selectedDisplay]);

  async function handleSubmit(values: {
    display: string;
    refreshRate: string;
    autoRevert?: boolean;
    revertTimeout?: string;
  }) {
    const displayIndex = parseInt(values.display, 10);
    const refreshRate = parseInt(values.refreshRate, 10);
    const enableAutoRevert = values.autoRevert ?? autoRevertEnabled;
    const timeout = values.revertTimeout ?? revertTimeout;

    debugLog("Form submitted:", { displayIndex, refreshRate, enableAutoRevert, timeout });

    // Save selections to LocalStorage
    await LocalStorage.setItem("lastSelectedDisplay", values.display);
    await LocalStorage.setItem("lastSelectedRefreshRate", values.refreshRate);

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Changing refresh rate...",
    });

    try {
      // Get current refresh rate before changing
      const currentRate = await getCurrentRefreshRate(displayIndex);
      debugLog("Current refresh rate:", currentRate);

      // Save current rate for potential revert
      await LocalStorage.setItem("previousRefreshRate", currentRate.toString());
      await LocalStorage.setItem("previousDisplay", displayIndex.toString());

      // Change the refresh rate
      const success = await changeRefreshRate(displayIndex, refreshRate);

      if (success) {
        toast.style = Toast.Style.Success;
        toast.title = "Refresh rate changed";
        toast.message = `Display ${displayIndex + 1} set to ${refreshRate}Hz (from ${currentRate}Hz)`;

        // Handle auto-revert if enabled
        if (enableAutoRevert) {
          const timeoutSeconds = parseInt(timeout, 10);
          toast.primaryAction = {
            title: `Reverting in ${timeoutSeconds}s`,
            onAction: async () => {
              // Cancel the auto-revert
              await LocalStorage.removeItem("autoRevertScheduled");
            },
          };

          // Schedule auto-revert
          await LocalStorage.setItem("autoRevertScheduled", "true");

          setTimeout(async () => {
            const shouldRevert = await LocalStorage.getItem("autoRevertScheduled");
            if (shouldRevert === "true") {
              debugLog("Auto-reverting refresh rate...");
              try {
                await changeRefreshRate(displayIndex, currentRate);
                await showToast({
                  style: Toast.Style.Success,
                  title: "Reverted refresh rate",
                  message: `Display ${displayIndex + 1} reverted to ${currentRate}Hz`,
                });
              } catch (error) {
                debugLog("Error reverting:", error);
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Failed to revert",
                  message: error instanceof Error ? error.message : String(error),
                });
              }
              await LocalStorage.removeItem("autoRevertScheduled");
            }
          }, timeoutSeconds * 1000);
        }

        // Close the window after a short delay if auto-close is enabled
        if (autoCloseWindow) {
          setTimeout(async () => {
            await closeMainWindow();
          }, 1500);
        }
      } else {
        throw new Error("Failed to change refresh rate");
      }
    } catch (error) {
      debugLog("Error in handleSubmit:", error);
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to change refresh rate";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Change Refresh Rate" icon={Icon.Monitor} onSubmit={handleSubmit} />
          <Action
            title="Revert to Previous"
            icon={Icon.Undo}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={async () => {
              const prevRate = await LocalStorage.getItem<string>("previousRefreshRate");
              const prevDisplay = await LocalStorage.getItem<string>("previousDisplay");

              if (prevRate && prevDisplay) {
                const toast = await showToast({
                  style: Toast.Style.Animated,
                  title: "Reverting...",
                });

                try {
                  await changeRefreshRate(parseInt(prevDisplay, 10), parseInt(prevRate, 10));
                  toast.style = Toast.Style.Success;
                  toast.title = "Reverted successfully";
                  toast.message = `Display ${parseInt(prevDisplay, 10) + 1} set to ${prevRate}Hz`;

                  setTimeout(async () => {
                    await closeMainWindow();
                  }, 1500);
                } catch (error) {
                  toast.style = Toast.Style.Failure;
                  toast.title = "Failed to revert";
                  toast.message = error instanceof Error ? error.message : String(error);
                }
              } else {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "No previous refresh rate found",
                });
              }
            }}
          />
          <ActionPanel.Section title="Cache">
            <Action
              title="Clear Cache"
              icon={Icon.Trash}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
              onAction={async () => {
                const toast = await showToast({
                  style: Toast.Style.Animated,
                  title: "Clearing cache...",
                });

                try {
                  await clearCache();
                  toast.style = Toast.Style.Success;
                  toast.title = "Cache cleared";
                  toast.message = "Display data will be reloaded";

                  // Reload displays
                  setIsLoading(true);
                  const displayList = await getDisplays();
                  setDisplays(displayList);
                  setIsLoading(false);
                } catch (error) {
                  toast.style = Toast.Style.Failure;
                  toast.title = "Failed to clear cache";
                  toast.message = error instanceof Error ? error.message : String(error);
                }
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.Dropdown id="display" title="Display" value={selectedDisplay} onChange={setSelectedDisplay} storeValue>
        {displays.map((display, index) => (
          <Form.Dropdown.Item
            key={index}
            value={index.toString()}
            title={`Display ${index + 1}${display.IsPrimary ? " (Primary)" : ""}`}
            icon={display.IsPrimary ? Icon.Star : Icon.Monitor}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="refreshRate"
        title="Refresh Rate"
        value={selectedRefreshRate}
        onChange={setSelectedRefreshRate}
        storeValue
      >
        {availableRates.map((rate) => (
          <Form.Dropdown.Item
            key={rate}
            value={rate.toString()}
            title={`${rate} Hz${currentRate === rate ? " (Current)" : ""}`}
          />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      <Form.Checkbox
        id="autoClose"
        label="Auto-close window after changing"
        value={autoCloseWindow}
        onChange={(value) => {
          setAutoCloseWindow(value);
          LocalStorage.setItem("lastAutoClose", value.toString());
        }}
      />

      <Form.Checkbox
        id="autoRevert"
        label="Auto-revert after timeout"
        value={autoRevertEnabled}
        onChange={(value) => {
          setAutoRevertEnabled(value);
          LocalStorage.setItem("lastAutoRevert", value.toString());
        }}
      />

      <Form.Dropdown
        id="revertTimeout"
        title="Revert Timeout"
        value={revertTimeout}
        onChange={(value) => {
          setRevertTimeout(value);
          LocalStorage.setItem("lastRevertTimeout", value);
        }}
        info="Time before automatically reverting to previous refresh rate"
      >
        <Form.Dropdown.Item value="1" title="1 second" />
        <Form.Dropdown.Item value="5" title="5 seconds" />
        <Form.Dropdown.Item value="10" title="10 seconds" />
        <Form.Dropdown.Item value="15" title="15 seconds" />
        <Form.Dropdown.Item value="30" title="30 seconds" />
        <Form.Dropdown.Item value="60" title="60 seconds" />
      </Form.Dropdown>

      <Form.Description
        title="Info"
        text={`Current: ${currentRate ? `${currentRate} Hz` : "Loading..."}${preferences.debugMode ? "\n✓ Debug mode enabled" : ""}`}
      />
    </Form>
  );
}
