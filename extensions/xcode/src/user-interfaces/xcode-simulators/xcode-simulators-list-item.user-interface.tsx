import { ActionPanel, ActionPanelProps, Color, Icon, ImageLike, List, showToast, ToastStyle } from "@raycast/api";
import { XcodeSimulator } from "../../models/simulator/xcode-simulator.model";
import { XcodeSimulatorService } from "../../services/xcode-simulator.service";
import { ReactElement } from "react";

/**
 * XcodeSimulator List Item
 * @param xcodeSimulator The XcodeSimulator
 * @param xcodeSimulatorService The XcodeSimulatorService
 */
export function xcodeSimulatorListItem(
  xcodeSimulator: XcodeSimulator,
  xcodeSimulatorService: XcodeSimulatorService
): JSX.Element {
  return (
    <List.Item
      key={xcodeSimulator.udid}
      icon={{ source: "xcode-simulator.png" }}
      title={xcodeSimulator.name}
      subtitle={xcodeSimulator.runtime}
      accessoryTitle={xcodeSimulator.state}
      accessoryIcon={accessoryIcon(xcodeSimulator)}
      keywords={[xcodeSimulator.name, xcodeSimulator.runtime]}
      actions={actions(xcodeSimulator, xcodeSimulatorService)}
    />
  );
}

/**
 * Retrieve accessory icon for XcodeSimulator
 * @param xcodeSimulator The XcodeSimulator
 */
function accessoryIcon(xcodeSimulator: XcodeSimulator): ImageLike | undefined {
  switch (xcodeSimulator.state) {
    case "Booted":
      return {
        source: Icon.Checkmark,
        tintColor: Color.Green,
      };
    case "Pending":
      return {
        source: Icon.Dot,
        tintColor: Color.Yellow,
      };
    case "Shutdown":
      return {
        source: Icon.Circle,
        tintColor: Color.SecondaryText,
      };
    default:
      return undefined;
  }
}

/**
 * Retrieve actions for XcodeSimulator
 * @param xcodeSimulator The XcodeSimulator
 * @param xcodeSimulatorService The XcodeSimulatorService
 */
function actions(
  xcodeSimulator: XcodeSimulator,
  xcodeSimulatorService: XcodeSimulatorService
): ReactElement<ActionPanelProps> | undefined {
  // Check if XcodeSimulator state is pending
  if (xcodeSimulator.state === "Pending") {
    // Return no actions
    return undefined;
  }
  // Initialize bool if XcodeSimulator is shutdown
  const isShutdown = xcodeSimulator.state === "Shutdown";
  // Return ActionPanel
  return (
    <ActionPanel>
      <ActionPanel.Item
        key={"boot-or-shutdown"}
        title={isShutdown ? "Boot" : "Shutdown"}
        onAction={async () => {
          // Show loading Toast
          const loadingToast = await showToast(ToastStyle.Animated, "Please wait");
          try {
            // Check if XcodeSimulator is shutdown
            if (isShutdown) {
              // Boot XcodeSimulator
              await xcodeSimulatorService.boot(xcodeSimulator);
            } else {
              // Shutdown XcodeSimulator
              await xcodeSimulatorService.shutdown(xcodeSimulator);
            }
          } catch {
            // Hide loading Toast
            await loadingToast.hide();
            // Show failure Toast
            return showToast(
              ToastStyle.Failure,
              `Failed to ${isShutdown ? "boot" : "shutdown"} ${xcodeSimulator.name}`
            );
          }
          // Hide loading Toast
          await loadingToast.hide();
          // Show success Toast
          return showToast(ToastStyle.Success, `${xcodeSimulator.name} ${isShutdown ? "booted" : "shutdown"}`);
        }}
      />
    </ActionPanel>
  );
}
