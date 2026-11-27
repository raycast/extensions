/**
 * Actions shared by the list views: opening the native app, and the action panel
 * attached to every application row.
 */

import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import { AppGroup } from "../data/types";
import { openApp } from "../utils/deepLink";
import { forceQuitApp, quitApp } from "../utils/processControl";
import { SubprocessList } from "./SubprocessList";

/** Opens the native Mac Performance Monitor app (Cmd+O). */
export function OpenMonitorAction() {
  return (
    <Action
      title="Open Mac Performance Monitor"
      icon={Icon.AppWindow}
      shortcut={Keyboard.Shortcut.Common.Open}
      onAction={openApp}
    />
  );
}

interface AppGroupActionsProps {
  app: AppGroup;
  /** Called after a quit so the list drops the app right away instead of on the next tick. */
  onRefresh: () => void;
}

/** The action panel for one application row: drill into its processes, quit or force quit it, open the native app. */
export function AppGroupActions(props: AppGroupActionsProps) {
  const app = props.app;

  async function handleQuit() {
    await quitApp(app);
    props.onRefresh();
  }

  async function handleForceQuit() {
    await forceQuitApp(app);
    props.onRefresh();
  }

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.Push title="Inspect Processes" icon={Icon.List} target={<SubprocessList appName={app.appName} />} />
        <OpenMonitorAction />
      </ActionPanel.Section>
      <ActionPanel.Section title={app.appName}>
        <Action
          title="Quit App"
          icon={Icon.XMarkCircle}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["ctrl"], key: "q" }}
          onAction={handleQuit}
        />
        <Action
          title="Force Quit App"
          icon={Icon.ExclamationMark}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["ctrl", "shift"], key: "q" }}
          onAction={handleForceQuit}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
