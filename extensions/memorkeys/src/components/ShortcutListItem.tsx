import { List, Icon, ActionPanel, Action, closeMainWindow, popToRoot, getPreferenceValues } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { HelpDetailView } from "./HelpDetailView";
import UploadConfig from "./upload-config";
import { ShortcutDetailView } from "./ShortcutDetailView";

const execAsync = promisify(exec);

// Defines the structure of a shortcut item
interface ShortcutData {
  name: string;
  application: string;
  source: string;
  type: string;
  key: string;
  shortcut: string;
  control: boolean;
  shift: boolean;
  option: boolean;
  command: boolean;
  keyCode: string;
  keyName: string;
}

interface ShortcutListItemProps {
  shortcut: ShortcutData; // The shortcut to display
  hideApplication?: boolean; // Whether to hide the app name
  showOnlyFocused?: boolean; // Whether we're filtering by current app
  onToggleFocused?: () => void; // Handler for toggling app filter
  onReload?: () => void; // Handler for reloading shortcuts
  currentIndex: number; // Index in the shortcuts list
  shortcuts: ShortcutData[]; // All shortcuts for navigation
  creationTime?: Date; // When shortcuts were last updated
}

// Component that renders a single shortcut in the list view
export const ShortcutListItem = ({
  shortcut,
  hideApplication = false,
  showOnlyFocused = false,
  onToggleFocused,
  onReload,
  currentIndex,
  shortcuts,
  creationTime,
}: ShortcutListItemProps) => {
  // Generate the list of accessory items (modifier keys and main key)
  const getAccessories = () => {
    const accessories: List.Item.Accessory[] = [];
    const modifiers = [];
    const preferences = getPreferenceValues();

    // Add modifier key symbols
    if (shortcut.command) modifiers.push("⌘");
    if (shortcut.option) modifiers.push("⌥");
    if (shortcut.shift) modifiers.push("⇧");
    if (shortcut.control) modifiers.push("⌃");

    // Add each modifier with a plus icon between
    modifiers.forEach((mod, index) => {
      accessories.push({
        tag: {
          value: mod,
          color: { light: "#554b3f", dark: "#e5d8c9" },
        },
        tooltip: mod,
      });

      if ((index < modifiers.length - 1 || shortcut.keyName) && preferences.showPlusIcon) {
        accessories.push({
          icon: Icon.Plus,
        });
      }
    });

    // Map special keys to their symbols
    const specialKeyMap: { [key: string]: string } = {
      delete: "⌫",
      return: "↩",
      escape: "⎋",
      up: "↑",
      down: "↓",
      left: "←",
      right: "→",
    };

    // Add the main key
    if (shortcut.keyName) {
      const displayKey = specialKeyMap[shortcut.keyName.toLowerCase()] || shortcut.keyName.toUpperCase();

      accessories.push({
        tag: {
          value: displayKey,
          color: { light: "#554b3f", dark: "#e5d8c9" },
        },
        tooltip: shortcut.keyName,
      });
    }

    return accessories;
  };

  // Execute the shortcut using AppleScript
  const executeShortcut = async () => {
    try {
      const modifiers: string[] = [];

      if (shortcut.command) modifiers.push("command");
      if (shortcut.option) modifiers.push("option");
      if (shortcut.shift) modifiers.push("shift");
      if (shortcut.control) modifiers.push("control");

      // Create AppleScript command to simulate key press
      const script = `
        tell application "System Events"
          ${modifiers.map((mod) => `key down ${mod}`).join("\n")}
          ${shortcut.keyCode ? `key code ${shortcut.keyCode}` : ""}
          ${modifiers.map((mod) => `key up ${mod}`).join("\n")}
        end tell
      `;

      // Close Raycast before executing shortcut
      await closeMainWindow();
      await popToRoot();

      // Execute the shortcut
      await execAsync(`osascript -e '${script}'`);
    } catch (error) {
      console.error("Failed to execute shortcut:", error);
    }
  };

  // Render the list item with actions
  return (
    <List.Item
      title={shortcut.name}
      subtitle={hideApplication ? undefined : shortcut.application}
      accessories={getAccessories()}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Memorkeys">
            <Action title="Perform Shortcut" onAction={executeShortcut} icon={Icon.PlayFilled} />
            <Action
              title={showOnlyFocused ? "Show All Apps" : "Show Current App Only"}
              onAction={onToggleFocused}
              icon={Icon.Filter}
              shortcut={{ modifiers: ["cmd"], key: "return" }}
            />
            <Action.Push
              title="View Details"
              target={
                <ShortcutDetailView shortcuts={shortcuts} initialIndex={currentIndex} creationTime={creationTime} />
              }
              icon={Icon.Info}
              shortcut={{ modifiers: ["cmd"], key: "i" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Help">
            <Action
              title="Reload Shortcuts"
              icon={Icon.RotateClockwise}
              onAction={onReload}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
            <Action.Push
              title="Open Upload Config"
              target={<UploadConfig />}
              icon={Icon.Upload}
              shortcut={{ modifiers: ["cmd"], key: "u" }}
            />
            <Action.ShowInFinder
              title="Open Configs Directory"
              path={process.env.HOME ? path.join(process.env.HOME, ".memorkeys", "processed_configs") : ""}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
            <Action.Push
              title="View Setup Instructions"
              target={
                <HelpDetailView
                  configPath={process.env.HOME ? path.join(process.env.HOME, ".memorkeys", "processed_configs") : ""}
                />
              }
              icon={Icon.QuestionMark}
              shortcut={{ modifiers: ["cmd"], key: "h" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};
