import { MenuBarExtra, open } from "@raycast/api";
import { useMemo } from "react";
import { useShortcuts } from "./hooks/useConfig";
import { parseShortcutKey } from "./utils/keys";
import { executeShortcutInMode } from "./utils/executeShortcut";

export default function Command() {
  const { shortcuts, isLoading, error } = useShortcuts();

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
    <MenuBarExtra icon="menubar-icon.png" tooltip="Your Shortcuts" isLoading={isLoading}>
      {error && (
        <MenuBarExtra.Item
          title={`Error: ${error instanceof Error ? error.message : String(error)}`}
          onAction={() => open("https://nikitabobko.github.io/AeroSpace/guide#installation")}
        />
      )}
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
