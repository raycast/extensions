import {
  getPreferenceValues,
  Icon,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  open,
  openExtensionPreferences,
  showHUD,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { useShortcuts } from "./hooks/useConfig";
import { parseShortcutKey } from "./utils/keys";
import { executeShortcutInMode } from "./utils/executeShortcut";
import {
  AeroSpaceError,
  balanceWorkspace,
  openAeroSpaceApplication,
  reloadConfig,
  subscribeToAeroSpaceEvents,
  toggleAeroSpaceEnabled,
  workspaceBackAndForth,
} from "./utils/aerospace";
import { visibleShortcuts } from "./utils/config";

async function runMenuAction(title: string, operation: () => Promise<void>, successMessage?: string) {
  try {
    await operation();
    if (successMessage) await showHUD(successMessage);
  } catch (error) {
    await showFailureToast(error, { title });
  }
}

export default function Command() {
  const { shortcuts, isLoading, error, revalidate } = useShortcuts();
  const { showFullBindings, showMenuBarExtras, showWorkspaceName } = getPreferenceValues<Preferences>();
  const [workspace, setWorkspace] = useState<string>();
  const [mode, setMode] = useState<string>();
  const [streamError, setStreamError] = useState<AeroSpaceError>();

  useEffect(() => {
    let stop: (() => void) | undefined;
    let cancelled = false;
    subscribeToAeroSpaceEvents(
      (event) => {
        setStreamError(undefined);
        if (event.type === "mode-changed") setMode(event.mode);
        if (
          event.type === "focus-changed" ||
          event.type === "focused-monitor-changed" ||
          event.type === "focused-workspace-changed"
        ) {
          setWorkspace(event.workspace);
        }
      },
      (subscriptionError) => setStreamError(subscriptionError),
    )
      .then((cleanup) => {
        if (cancelled) cleanup();
        else stop = cleanup;
      })
      .catch((subscriptionError: unknown) => {
        setStreamError(
          subscriptionError instanceof AeroSpaceError
            ? subscriptionError
            : new AeroSpaceError(String(subscriptionError), "command-failed"),
        );
      });

    return () => {
      cancelled = true;
      stop?.();
    };
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof shortcuts>();
    for (const shortcut of visibleShortcuts(shortcuts, showFullBindings !== false)) {
      const list = map.get(shortcut.mode) || [];
      list.push(shortcut);
      map.set(shortcut.mode, list);
    }
    return map;
  }, [shortcuts, showFullBindings]);

  const menuTitle =
    showWorkspaceName && workspace ? (mode && mode !== "main" ? `${workspace} · ${mode}` : workspace) : undefined;
  const tooltip = workspace
    ? `AeroSpace — Workspace ${workspace}${mode ? `, ${mode} mode` : ""}`
    : "AeroSpace Shortcuts";

  return (
    <MenuBarExtra icon="menubar-icon.png" title={menuTitle} tooltip={tooltip} isLoading={isLoading}>
      {!isLoading && !error && shortcuts.length === 0 && <MenuBarExtra.Item title="No Shortcuts Found" />}
      {[...grouped.entries()].map(([bindingMode, modeShortcuts]) => (
        <MenuBarExtra.Section
          key={bindingMode}
          title={`${bindingMode.charAt(0).toUpperCase() + bindingMode.slice(1)} Mode`}
        >
          {modeShortcuts.map((shortcut) => {
            const parsed = parseShortcutKey(shortcut.key);
            return (
              <MenuBarExtra.Item
                key={`${shortcut.mode}:${shortcut.key}`}
                title={shortcut.title}
                subtitle={shortcut.command}
                shortcut={parsed ?? undefined}
                onAction={() => executeShortcutInMode(shortcut)}
              />
            );
          })}
        </MenuBarExtra.Section>
      ))}

      {showMenuBarExtras !== false && (
        <>
          <MenuBarExtra.Section title="Quick Actions">
            <MenuBarExtra.Item
              title="Previous Workspace"
              icon={Icon.ArrowLeft}
              onAction={() => runMenuAction("Could Not Switch Workspace", workspaceBackAndForth)}
            />
            <MenuBarExtra.Item
              title="Balance Window Sizes"
              icon={Icon.Ruler}
              onAction={() =>
                runMenuAction("Could Not Balance Window Sizes", () => balanceWorkspace(), "Sizes Balanced")
              }
            />
            <MenuBarExtra.Item
              title="Validate and Reload Config"
              icon={Icon.ArrowClockwise}
              onAction={() => runMenuAction("Configuration Was Not Reloaded", reloadConfig, "Config Reloaded")}
            />
            <MenuBarExtra.Item
              title="Toggle AeroSpace"
              icon={Icon.Switch}
              onAction={() => runMenuAction("Could Not Toggle AeroSpace", toggleAeroSpaceEnabled)}
            />
          </MenuBarExtra.Section>

          <MenuBarExtra.Section title="Open">
            <MenuBarExtra.Item
              title="Browse Workspaces…"
              icon={Icon.Desktop}
              onAction={() => launchCommand({ name: "goToWorkspace", type: LaunchType.UserInitiated })}
            />
            <MenuBarExtra.Item
              title="Switch Windows…"
              icon={Icon.AppWindowGrid3x3}
              onAction={() => launchCommand({ name: "switchApps", type: LaunchType.UserInitiated })}
            />
            <MenuBarExtra.Item
              title="Open Bindings…"
              icon={Icon.Keyboard}
              onAction={() => launchCommand({ name: "showShortcuts", type: LaunchType.UserInitiated })}
            />
            <MenuBarExtra.Item
              title="View What’s New…"
              icon={Icon.Document}
              onAction={() => open("https://www.raycast.com/limonkufu/aerospace")}
            />
          </MenuBarExtra.Section>
        </>
      )}

      <MenuBarExtra.Section title="Status">
        <MenuBarExtra.Item title={workspace ? `Workspace ${workspace}` : "Workspace unavailable"} />
        <MenuBarExtra.Item title={mode ? `${mode.charAt(0).toUpperCase() + mode.slice(1)} mode` : "Mode unavailable"} />
        {streamError && <MenuBarExtra.Item title="Live status unavailable" subtitle={streamError.message} />}
      </MenuBarExtra.Section>

      {error && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item title={`Error: ${error.message}`} onAction={revalidate} />
          {error instanceof AeroSpaceError && error.kind === "server-unavailable" && (
            <MenuBarExtra.Item
              title="Open AeroSpace"
              onAction={() => runMenuAction("Could Not Open AeroSpace", openAeroSpaceApplication)}
            />
          )}
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Refresh Bindings" icon={Icon.ArrowClockwise} onAction={revalidate} />
        <MenuBarExtra.Item title="Extension Preferences…" icon={Icon.Gear} onAction={openExtensionPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
