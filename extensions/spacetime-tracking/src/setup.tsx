/* eslint-disable @raycast/prefer-title-case -- action title references the Dock */
import {
  Action,
  ActionPanel,
  Color,
  Icon,
  LaunchType,
  List,
  Toast,
  launchCommand,
  open,
  showToast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { listSpaces } from "./lib/native";
import { isMenuBarActive } from "./lib/menubar";
import {
  areSystemShortcutsEnabled,
  disableAutoRearrange,
  enableSystemShortcuts,
  isAutoRearrangeOn,
  runFullSetup,
} from "./lib/desktopShortcuts";
import { checkAccessibility } from "./lib/spaceSwitch";
import { SpaceInfo } from "./lib/format";

const ACCESSIBILITY_URL = "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility";
const MISSION_CONTROL_URL = "x-apple.systempreferences:com.apple.preference.keyboard?Shortcuts";

type Tri = boolean | undefined; // undefined = not checked yet

export default function Command() {
  const [spaces, setSpaces] = useState<SpaceInfo[]>([]);
  const [shortcuts, setShortcuts] = useState<Tri>(undefined);
  const [rearrangeOff, setRearrangeOff] = useState<Tri>(undefined);
  const [menubar, setMenubar] = useState<Tri>(undefined);
  const [accessibility, setAccessibility] = useState<Tri>(undefined);
  const [loading, setLoading] = useState(true);

  async function refresh(withAccessibility = true) {
    let sp: SpaceInfo[] = [];
    try {
      sp = listSpaces(true);
    } catch {
      sp = [];
    }
    setSpaces(sp);
    setShortcuts(areSystemShortcutsEnabled(sp));
    setRearrangeOff(!isAutoRearrangeOn());
    setMenubar(isMenuBarActive());
    setLoading(false);
    if (withAccessibility) {
      setAccessibility(undefined);
      setAccessibility(await checkAccessibility());
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const statusAccessory = (ok: Tri): List.Item.Accessory =>
    ok === undefined
      ? { tag: { value: "Checking…", color: Color.SecondaryText } }
      : ok
        ? { tag: { value: "OK", color: Color.Green }, icon: { source: Icon.CheckCircle, tintColor: Color.Green } }
        : {
            tag: { value: "Action needed", color: Color.Orange },
            icon: { source: Icon.Circle, tintColor: Color.Orange },
          };

  const runAll = async () => {
    try {
      runFullSetup(spaces);
      // Also register the menu-bar icon by launching its command once.
      try {
        await launchCommand({ name: "tracker", type: LaunchType.UserInitiated });
      } catch {
        // menu bar can still be activated from its own row below
      }
      await refresh(true);
      await showToast({
        style: Toast.Style.Success,
        title: "Setup applied",
        message: "If Accessibility is still off, grant it below.",
      });
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Setup failed",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const runFullSetupAction = <Action title="Run Full Setup" icon={Icon.Wand} onAction={runAll} />;
  const recheckAction = <Action title="Re-check" icon={Icon.ArrowClockwise} onAction={() => refresh(true)} />;

  const showMenuBar = async () => {
    try {
      await launchCommand({ name: "tracker", type: LaunchType.UserInitiated });
      // Give the menu-bar command a moment to render and write its marker.
      setTimeout(() => void refresh(false), 800);
      await showToast({
        style: Toast.Style.Success,
        title: "Menu bar activated",
        message: "Look for the Spacetime ⏰ icon in your menu bar.",
      });
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not open the menu bar command",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const allGood = shortcuts && rearrangeOff && menubar && accessibility;

  return (
    <List isLoading={loading}>
      <List.Section
        title="Setup Spaces"
        subtitle={allGood ? "Everything is ready ✓" : "Run Full Setup (⌘↵), then grant Accessibility"}
      >
        <List.Item
          icon={Icon.Keyboard}
          title="Switch-to-Desktop shortcuts"
          subtitle="Enables Ctrl+1…N in Mission Control"
          accessories={[statusAccessory(shortcuts)]}
          actions={
            <ActionPanel>
              {runFullSetupAction}
              <Action
                title="Enable Shortcuts"
                icon={Icon.Keyboard}
                onAction={async () => {
                  try {
                    enableSystemShortcuts(spaces);
                    await refresh(false);
                    await showToast({ style: Toast.Style.Success, title: "Shortcuts enabled" });
                  } catch (err) {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Could not enable shortcuts",
                      message: err instanceof Error ? err.message : String(err),
                    });
                  }
                }}
              />
              <Action title="Open Keyboard Settings" icon={Icon.Gear} onAction={() => open(MISSION_CONTROL_URL)} />
              {recheckAction}
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Shuffle}
          title="Auto-rearrange Spaces is off"
          subtitle="Keeps desktop numbering stable so Ctrl+N maps correctly"
          accessories={[statusAccessory(rearrangeOff)]}
          actions={
            <ActionPanel>
              {runFullSetupAction}
              <Action
                title="Disable Auto-Rearrange (Restarts Dock)"
                icon={Icon.Shuffle}
                onAction={async () => {
                  try {
                    disableAutoRearrange();
                    await refresh(false);
                    await showToast({ style: Toast.Style.Success, title: "Auto-rearrange disabled" });
                  } catch (err) {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Could not change setting",
                      message: err instanceof Error ? err.message : String(err),
                    });
                  }
                }}
              />
              {recheckAction}
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.AppWindowList}
          title="Menu bar item"
          subtitle="Registers the Spacetime icon in your menu bar (run once)"
          accessories={[statusAccessory(menubar)]}
          actions={
            <ActionPanel>
              <Action title="Show Menu Bar Icon" icon={Icon.AppWindowList} onAction={showMenuBar} />
              {recheckAction}
              {runFullSetupAction}
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Lock}
          title="Accessibility permission"
          subtitle="Required for Raycast to send the switch keystroke"
          accessories={[statusAccessory(accessibility)]}
          actions={
            <ActionPanel>
              <Action title="Open Accessibility Settings" icon={Icon.Lock} onAction={() => open(ACCESSIBILITY_URL)} />
              {recheckAction}
              {runFullSetupAction}
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
