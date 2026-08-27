import { MenuBarExtra, openExtensionPreferences } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useMemo } from "react";
import { useShortcuts } from "./hooks/useConfig";
import { parseShortcutKey } from "./utils/keys";
import { executeShortcutInMode } from "./utils/executeShortcut";
import { AeroSpaceError, openAeroSpaceApplication } from "./utils/aerospace";

export default function Command() {
  const { shortcuts, isLoading, error, revalidate } = useShortcuts();

  const grouped = useMemo(() => {
    const map = new Map<string, typeof shortcuts>();
    for (const s of shortcuts) {
      const list = map.get(s.mode) || [];
      list.push(s);
      map.set(s.mode, list);
    }
    return map;
  }, [shortcuts]);

  return (
    <MenuBarExtra icon="menubar-icon.png" tooltip="AeroSpace Shortcuts" isLoading={isLoading}>
      {error && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item title={`Error: ${error.message}`} onAction={revalidate} />
          {error instanceof AeroSpaceError && error.kind === "server-unavailable" && (
            <MenuBarExtra.Item
              title="Open AeroSpace"
              onAction={async () => {
                try {
                  await openAeroSpaceApplication();
                } catch (openError) {
                  await showFailureToast(openError, { title: "Could Not Open AeroSpace" });
                }
              }}
            />
          )}
          <MenuBarExtra.Item title="Open Extension Preferences" onAction={() => openExtensionPreferences()} />
        </MenuBarExtra.Section>
      )}
      {!isLoading && !error && shortcuts.length === 0 && <MenuBarExtra.Item title="No Shortcuts Found" />}
      {[...grouped.entries()].map(([mode, modeShortcuts]) => (
        <MenuBarExtra.Section key={mode} title={mode.charAt(0).toUpperCase() + mode.slice(1)}>
          {modeShortcuts.map((shortcut) => {
            const parsed = parseShortcutKey(shortcut.key);
            return (
              <MenuBarExtra.Item
                key={shortcut.key}
                title={shortcut.command}
                shortcut={parsed ?? undefined}
                onAction={() => executeShortcutInMode(shortcut)}
              />
            );
          })}
        </MenuBarExtra.Section>
      ))}
    </MenuBarExtra>
  );
}
