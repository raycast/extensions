import { MenuBarExtra, open } from "@raycast/api";
import { useShortcuts } from "./hooks/useConfig";
import { parseShortcutKey } from "./utils/keys";
import { executeShortcutInMode } from "./utils/executeShortcut";

export default function Command() {
  const { shortcuts, isLoading, error } = useShortcuts();

  const grouped = new Map<string, typeof shortcuts>();
  for (const s of shortcuts) {
    const list = grouped.get(s.mode) || [];
    list.push(s);
    grouped.set(s.mode, list);
  }

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
            const { modifiers, key } = parseShortcutKey(shortcut.key);
            return (
              <MenuBarExtra.Item
                key={shortcut.key}
                title={shortcut.command}
                shortcut={{ modifiers, key }}
                onAction={() => executeShortcutInMode(shortcut)}
              />
            );
          })}
        </MenuBarExtra.Section>
      ))}
    </MenuBarExtra>
  );
}
