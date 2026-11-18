import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  Color,
  Keyboard,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  getAllDisplays as getDisplaysSwift,
  reinitializeDisplay as reinitializeDisplaySwift,
} from "swift:../swift/display-helper";

interface Display {
  id: number;
  name: string;
  uuid: string;
  isMain: boolean;
  isBuiltIn: boolean;
  width: number;
  height: number;
  availableMethods: string[];
  hasMultipleRefreshRates: boolean;
  recommendedMethod: string;
}

type ReinitMethod = "auto" | "ddc" | "refresh" | "resolution" | "soft";

interface MethodInfo {
  name: string;
  description: string;
  icon: Icon;
  disruptionLevel: string;
}

const METHOD_INFO: Record<ReinitMethod, MethodInfo> = {
  auto: {
    name: "Auto-Select Best Method",
    description:
      "Automatically selects the most effective method for this display",
    icon: Icon.Wand,
    disruptionLevel: "Varies",
  },
  ddc: {
    name: "DDC Power Cycle",
    description:
      "Hardware power cycle (external displays only, requires m1ddc)",
    icon: Icon.Plug,
    disruptionLevel: "Low",
  },
  refresh: {
    name: "Refresh Rate Toggle",
    description: "Temporarily change refresh rate and restore",
    icon: Icon.Clock,
    disruptionLevel: "Low",
  },
  resolution: {
    name: "Resolution Cycle",
    description: "Temporarily change resolution and restore",
    icon: Icon.Monitor,
    disruptionLevel: "Medium",
  },
  soft: {
    name: "Soft Reset",
    description: "Minimal reconfiguration (may not fix all issues)",
    icon: Icon.CircleProgress,
    disruptionLevel: "Very Low",
  },
};

export default function Command() {
  const [displays, setDisplays] = useState<Display[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDisplays();
  }, []);

  async function loadDisplays() {
    setIsLoading(true);
    try {
      const displayData = await getDisplays();
      setDisplays(displayData);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load displays",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleReinitialize(display: Display, method: ReinitMethod) {
    const methodInfo = METHOD_INFO[method];

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Reinitializing ${display.name}...`,
      message: `Using ${methodInfo.name.toLowerCase()}`,
    });

    try {
      await reinitializeDisplay(display.id, method);
      toast.style = Toast.Style.Success;
      toast.title = "Display Reinitialized";
      toast.message = `${display.name} via ${methodInfo.name.toLowerCase()}`;

      // Reload displays after a short delay to reflect any changes
      setTimeout(() => {
        loadDisplays();
      }, 1000);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Reinitialization Failed";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  function getMethodActions(display: Display) {
    const actions = [];

    // Add individual method actions based on availability
    const methodOrder: ReinitMethod[] = [
      "ddc",
      "refresh",
      "resolution",
      "soft",
    ];

    for (const method of methodOrder) {
      const isAvailable = display.availableMethods.includes(method);
      const methodInfo = METHOD_INFO[method];

      if (isAvailable) {
        const keyNumber = (
          actions.length + 1
        ).toString() as Keyboard.KeyEquivalent;
        actions.push(
          <Action
            key={method}
            title={methodInfo.name}
            icon={methodInfo.icon}
            onAction={() => handleReinitialize(display, method)}
            {...(keyNumber <= "9"
              ? { shortcut: { modifiers: [], key: keyNumber } }
              : {})}
          />,
        );
      }
    }

    return actions;
  }

  return (
    <List isLoading={isLoading}>
      {displays.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={{ source: Icon.Monitor, tintColor: Color.SecondaryText }}
          title="No Displays Found"
          description="Could not detect any connected displays"
        />
      ) : (
        displays.map((display) => (
          <List.Item
            key={display.uuid}
            icon={{
              source: display.isBuiltIn ? Icon.ComputerChip : Icon.Monitor,
              tintColor: display.isMain ? Color.Blue : Color.SecondaryText,
            }}
            title={display.name}
            subtitle={`${display.width}x${display.height}`}
            accessories={[
              ...(display.isMain
                ? [{ tag: { value: "Main", color: Color.Blue } }]
                : []),
              {
                tag: {
                  value: display.isBuiltIn ? "Built-in" : "External",
                  color: Color.SecondaryText,
                },
              },
              {
                tag: {
                  value: `Recommended: ${METHOD_INFO[display.recommendedMethod as ReinitMethod]?.name || display.recommendedMethod}`,
                  color: Color.Green,
                },
              },
              { text: `ID: ${display.id}` },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Primary Actions">
                  <Action
                    title="Reinitialize Display (Auto)"
                    icon={Icon.ArrowClockwise}
                    onAction={() => handleReinitialize(display, "auto")}
                  />
                  <Action
                    title="Refresh List"
                    icon={Icon.RotateClockwise}
                    onAction={loadDisplays}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section title="Choose Reinitialization Method">
                  {getMethodActions(display)}
                </ActionPanel.Section>

                <ActionPanel.Section title="Information">
                  <Action.Push
                    title="View Display Details"
                    icon={Icon.Info}
                    target={<DisplayDetails display={display} />}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

// Display Details View
function DisplayDetails({ display }: { display: Display }) {
  return (
    <List>
      <List.Section title="Display Information">
        <List.Item title="Name" subtitle={display.name} />
        <List.Item title="ID" subtitle={String(display.id)} />
        <List.Item
          title="Resolution"
          subtitle={`${display.width}x${display.height}`}
        />
        <List.Item
          title="Type"
          subtitle={display.isBuiltIn ? "Built-in" : "External"}
        />
        <List.Item
          title="Main Display"
          subtitle={display.isMain ? "Yes" : "No"}
        />
        <List.Item
          title="Multiple Refresh Rates"
          subtitle={display.hasMultipleRefreshRates ? "Yes" : "No"}
        />
      </List.Section>

      <List.Section title="Available Reinitialization Methods">
        {display.availableMethods.map((method) => {
          const methodInfo = METHOD_INFO[method as ReinitMethod];
          if (!methodInfo) return null;

          return (
            <List.Item
              key={method}
              icon={methodInfo.icon}
              title={methodInfo.name}
              subtitle={methodInfo.description}
              accessories={[
                {
                  tag: {
                    value: `Disruption: ${methodInfo.disruptionLevel}`,
                    color:
                      methodInfo.disruptionLevel === "Very Low"
                        ? Color.Green
                        : methodInfo.disruptionLevel === "Low"
                          ? Color.Blue
                          : methodInfo.disruptionLevel === "Medium"
                            ? Color.Orange
                            : Color.SecondaryText,
                  },
                },
                ...(display.recommendedMethod === method
                  ? [{ tag: { value: "Recommended", color: Color.Green } }]
                  : []),
              ]}
            />
          );
        })}
      </List.Section>
    </List>
  );
}

// MARK: - Helper Functions

async function getDisplays(): Promise<Display[]> {
  try {
    const displays = await getDisplaysSwift();
    return displays;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to get display list: ${error.message}`);
    }
    throw error;
  }
}

async function reinitializeDisplay(
  displayId: number,
  method: ReinitMethod,
): Promise<void> {
  try {
    await reinitializeDisplaySwift(displayId, method);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw error;
  }
}
