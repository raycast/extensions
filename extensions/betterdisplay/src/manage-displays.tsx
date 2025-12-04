import { useState, useEffect } from "react";
import {
  List,
  Color,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  getPreferenceValues,
  Application,
  popToRoot,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import {
  fetchDisplays,
  fetchDisplayStatus,
  fetchDisplayResolution,
  fetchMainDisplay,
  Display,
  toggleDisplay,
  togglePIP,
  increaseBrightness,
  decreaseBrightness,
  increaseContrast,
  decreaseContrast,
  availabilityBrightness,
  availabilityContrast,
} from "./commands";
import ResolutionList from "./list-resolutions";
import events from "./events";

type FilterOption = "all" | "displays" | "virtualScreens";

type DisplayItemProps = {
  display: Display;
  status: string;
  resolution: string;
  isMain: boolean;
  onToggle: () => void;
};

function verifyAppAvailability() {
  try {
    const { betterdisplayApp } = getPreferenceValues<{ betterdisplayApp: Application }>();
    if (betterdisplayApp.name !== "BetterDisplay") {
      showFailureToast("BetterDisplay app not set", {
        title: "BetterDisplay app not set",
        message: "Please set the BetterDisplay app in the extension preferences.",
      });
      popToRoot();
    }
  } catch (error) {
    showFailureToast("Failed to verify BetterDisplay app", {
      title: "Preference Error",
      message: "Could not access extension preferences.",
    });
    popToRoot();
  }
}

function DisplayItem({ display, status, resolution, isMain, onToggle }: DisplayItemProps) {
  const normalizedStatus = status || "Loading";
  const statusColor = normalizedStatus.toLowerCase() === "on" ? Color.Green : Color.Red;

  // New state to track availability of brightness and contrast functions.
  const [brightnessAvailable, setBrightnessAvailable] = useState(false);
  const [contrastAvailable, setContrastAvailable] = useState(false);

  useEffect(() => {
    async function checkAvailability() {
      if (normalizedStatus.toLowerCase() === "on") {
        const availB = await availabilityBrightness(display.tagID);
        const availC = await availabilityContrast(display.tagID);
        setBrightnessAvailable(availB);
        setContrastAvailable(availC);
      } else {
        setBrightnessAvailable(false);
        setContrastAvailable(false);
      }
    }
    checkAvailability();
  }, [display.tagID, normalizedStatus]);

  // Helper to wrap actions with toast notifications.
  async function handleAction(
    actionFn: () => Promise<string>,
    successTitle: string,
    successMessage: string,
    errorTitle: string,
  ) {
    try {
      const result = await actionFn();
      await showToast({ title: successTitle, message: result || successMessage, style: Toast.Style.Success });
      onToggle();
    } catch (error) {
      showFailureToast(error, { title: errorTitle });
    }
  }

  // Build accessories: always show status; if on, show resolution.
  const accessories: List.Item.Accessory[] = [{ tag: { value: normalizedStatus, color: statusColor } }];
  if (normalizedStatus.toLowerCase() === "on" && resolution && resolution !== "Loading") {
    accessories.unshift({ tag: { value: resolution, color: Color.Blue } });
  }

  return (
    <List.Item
      key={display.tagID}
      id={display.tagID}
      title={display.name}
      subtitle={isMain ? "Main Display" : undefined}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action
            title="Toggle Display"
            icon={Icon.Power}
            onAction={() =>
              handleAction(
                () => toggleDisplay(display.tagID),
                "Display toggled",
                `${display.name} has been toggled.`,
                "Error toggling display",
              )
            }
          />
          {normalizedStatus.toLowerCase() === "on" && (
            <>
              <Action
                title="Toggle Pip"
                icon={Icon.Image}
                onAction={() =>
                  handleAction(
                    () => togglePIP(display.tagID),
                    "PIP toggled",
                    `${display.name} PIP has been toggled.`,
                    "Error toggling PIP",
                  )
                }
              />
              {/* Only render brightness actions if available */}
              {brightnessAvailable && (
                <>
                  <Action
                    title="Increase Brightness"
                    icon={Icon.ArrowUp}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
                    onAction={() =>
                      handleAction(
                        () => increaseBrightness(display.tagID),
                        "Brightness Increased",
                        `${display.name} brightness increased.`,
                        "Error increasing brightness",
                      )
                    }
                  />
                  <Action
                    title="Decrease Brightness"
                    icon={Icon.ArrowDown}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
                    onAction={() =>
                      handleAction(
                        () => decreaseBrightness(display.tagID),
                        "Brightness Decreased",
                        `${display.name} brightness decreased.`,
                        "Error decreasing brightness",
                      )
                    }
                  />
                </>
              )}
              {/* Only render contrast actions if available */}
              {contrastAvailable && (
                <>
                  <Action
                    title="Increase Contrast"
                    icon={Icon.CircleProgress50}
                    shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
                    onAction={() =>
                      handleAction(
                        () => increaseContrast(display.tagID),
                        "Contrast Increased",
                        `${display.name} contrast increased.`,
                        "Error increasing contrast",
                      )
                    }
                  />
                  <Action
                    title="Decrease Contrast"
                    icon={Icon.Circle}
                    shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
                    onAction={() =>
                      handleAction(
                        () => decreaseContrast(display.tagID),
                        "Contrast Decreased",
                        `${display.name} contrast decreased.`,
                        "Error decreasing contrast",
                      )
                    }
                  />
                </>
              )}
              <Action.Push
                title="Change Resolution"
                icon={Icon.ArrowsExpand}
                shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
                target={<ResolutionList display={{ tagID: display.tagID, name: display.name }} />}
              />
            </>
          )}
        </ActionPanel>
      }
    />
  );
}

export default function ManageDisplays() {
  verifyAppAvailability();

  const [displays, setDisplays] = useState<Display[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statuses, setStatuses] = useState<{ [tagID: string]: string }>({});
  const [resolutions, setResolutions] = useState<{ [tagID: string]: string }>({});
  const [filter, setFilter] = useState<FilterOption>("all");
  const [mainDisplay, setMainDisplay] = useState<Display | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);

  // Load displays.
  useEffect(() => {
    async function loadDisplays() {
      try {
        const stdout = await fetchDisplays();
        const jsonString = stdout ? `[${stdout.trim()}]` : "[]";
        const data = JSON.parse(jsonString) as Display[];
        setDisplays(data);
      } catch (error) {
        console.error("Failed to load displays", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadDisplays();
  }, []);

  // Load main display.
  useEffect(() => {
    async function loadMainDisplay() {
      try {
        const main = await fetchMainDisplay();
        setMainDisplay(main);
      } catch (error) {
        console.error("Failed to load main display", error);
      }
    }
    loadMainDisplay();
  }, []);

  // Combined effect: fetch statuses then resolutions for displays that are "on".
  useEffect(() => {
    async function loadStatusesAndResolutions() {
      if (displays.length === 0) return;

      const newStatuses: { [tagID: string]: string } = {};
      await Promise.all(
        displays.map(async (display) => {
          const status = await fetchDisplayStatus(display.tagID);
          newStatuses[display.tagID] = status;
        }),
      );
      setStatuses(newStatuses);

      const newResolutions: { [tagID: string]: string } = {};
      await Promise.allSettled(
        displays.map(async (display) => {
          const status = newStatuses[display.tagID];
          if (status && status.toLowerCase() === "on") {
            try {
              const resolution = await fetchDisplayResolution(display.tagID);
              newResolutions[display.tagID] = resolution;
            } catch (error) {
              console.error(`Error fetching resolution for display ${display.tagID}:`, error);
            }
          }
        }),
      );
      setResolutions(newResolutions);
    }
    loadStatusesAndResolutions();
  }, [displays, refreshCount]);

  // Listen for refresh events emitted by the ResolutionList.
  useEffect(() => {
    const handler = () => setRefreshCount((prev) => prev + 1);
    events.on("refresh", handler);
    return () => {
      events.off("refresh", handler);
    };
  }, []);

  const handleToggleRefresh = () => {
    setRefreshCount((prev) => prev + 1);
  };

  const displayItems = displays.filter((d) => d.deviceType === "Display");
  const virtualScreenItems = displays.filter((d) => d.deviceType === "VirtualScreen");

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter displays by name"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter Display Type"
          storeValue={true}
          onChange={(newValue) => setFilter(newValue as FilterOption)}
        >
          <List.Dropdown.Section title="Filter">
            <List.Dropdown.Item value="all" title="All" />
            <List.Dropdown.Item value="displays" title="Displays" />
            <List.Dropdown.Item value="virtualScreens" title="Virtual Screens" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {(filter === "all" || filter === "displays") && (
        <List.Section title="Displays">
          {displayItems.map((display) => (
            <DisplayItem
              key={display.tagID}
              display={display}
              status={statuses[display.tagID] || "Loading"}
              resolution={resolutions[display.tagID] || "Loading"}
              isMain={mainDisplay?.tagID === display.tagID}
              onToggle={handleToggleRefresh}
            />
          ))}
        </List.Section>
      )}
      {(filter === "all" || filter === "virtualScreens") && (
        <List.Section title="Virtual Screens">
          {virtualScreenItems.map((display) => (
            <DisplayItem
              key={display.tagID}
              display={display}
              status={statuses[display.tagID] || "Loading"}
              resolution={resolutions[display.tagID] || "Loading"}
              isMain={mainDisplay?.tagID === display.tagID}
              onToggle={handleToggleRefresh}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
