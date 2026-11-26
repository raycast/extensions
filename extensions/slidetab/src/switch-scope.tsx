import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { runSlideTabCommand, SlideTabRoute } from "./utils";

export default function Command() {
  async function trigger(path: SlideTabRoute, message?: string) {
    await runSlideTabCommand(path, message);
  }

  return (
    <List navigationTitle="Configure SlideTab">
      <List.Section title="Switching Scope">
        <List.Item
          icon={Icon.AppWindowGrid3x3}
          title="All Windows"
          subtitle="Switch across every individual window of all open apps"
          actions={
            <ActionPanel>
              <Action
                title="Select All Windows"
                onAction={() => trigger("mode/all-windows", "SlideTab: All Windows")}
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.AppWindowList}
          title="Apps Only (Cmd + Tab)"
          subtitle="Classic app-level switching with zero permissions"
          actions={
            <ActionPanel>
              <Action title="Select Apps Only" onAction={() => trigger("mode/apps-only", "SlideTab: Apps Only")} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Window}
          title="Current App Windows (Cmd + `)"
          subtitle="Cycle windows of the frontmost app only"
          actions={
            <ActionPanel>
              <Action title="Select Current App" onAction={() => trigger("mode/active-app", "SlideTab: Current App")} />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Switch Bar Layout">
        <List.Item
          icon={Icon.AppWindowGrid2x2}
          title="Icons Bar (Horizontal)"
          subtitle="Slide left and right across app and window icons"
          actions={
            <ActionPanel>
              <Action title="Use Icons Layout" onAction={() => trigger("layout/icons", "SlideTab: Icons Layout")} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.List}
          title="Window List (Vertical)"
          subtitle="Slide down and up through full window titles"
          actions={
            <ActionPanel>
              <Action title="Use List Layout" onAction={() => trigger("layout/list", "SlideTab: List Layout")} />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Trackpad Trigger Gesture">
        <List.Item
          icon={Icon.Fingerprint}
          title="4 Fingers Only (Default)"
          subtitle="Avoids macOS 3-finger drag and Space swipes"
          actions={
            <ActionPanel>
              <Action title="Use 4 Fingers" onAction={() => trigger("fingers/4", "SlideTab: 4-Finger Slide")} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Fingerprint}
          title="3 Fingers Only"
          subtitle="Trigger Switch Bar with 3 fingers"
          actions={
            <ActionPanel>
              <Action title="Use 3 Fingers" onAction={() => trigger("fingers/3", "SlideTab: 3-Finger Slide")} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Fingerprint}
          title="3 or 4 Fingers (Auto)"
          subtitle="Accepts either 3 or 4 fingers"
          actions={
            <ActionPanel>
              <Action title="Use 3 or 4 Fingers" onAction={() => trigger("fingers/auto", "SlideTab: 3 or 4 Fingers")} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.ArrowRightCircle}
          title="Top Edge (2 Fingers)"
          subtitle="Zero overlap with any 3- or 4-finger system gesture"
          actions={
            <ActionPanel>
              <Action
                title="Use Top Edge 2 Fingers"
                onAction={() => trigger("fingers/top-edge", "SlideTab: Top Edge (2F)")}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Smart Pause & Settings">
        <List.Item
          icon={Icon.GameController}
          title="Toggle Auto-Pause in Fullscreen Games"
          subtitle="Automatically suspends gestures when a game is focused"
          actions={
            <ActionPanel>
              <Action
                title="Toggle Game Auto-Pause"
                onAction={() => trigger("toggle-game-pause", "Toggled Game Auto-Pause")}
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Keyboard}
          title="Open Shortcuts Settings (W / Q)"
          subtitle="Configure Switch Bar window-close and app-quit keys"
          actions={
            <ActionPanel>
              <Action title="Open Shortcuts Tab" onAction={() => trigger("settings/shortcuts")} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Star}
          title="Open About & License"
          subtitle="Manage SlideTab Free & SlideTab Pro license"
          actions={
            <ActionPanel>
              <Action title="Open About Tab" onAction={() => trigger("settings/about")} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
