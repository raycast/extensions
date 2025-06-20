/* eslint-disable @typescript-eslint/no-explicit-any */
import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { getConfig, handleConfigError } from "./utils/config";
import { normalizeKey } from "./utils/keys";
import { executeShortcut, extractKeyboardShortcuts } from "./utils/shortcuts";

export default function Command() {
  const { config, error } = getConfig();
  if (error) {
    handleConfigError(error);
  }
  if (config) {
    const keyboardShortcuts = extractKeyboardShortcuts(config);

    console.debug("Keyboard shortcuts:", keyboardShortcuts);

    // Group shortcuts by mode
    const shortcutsByMode = Object.entries(keyboardShortcuts).reduce(
      (acc, [key, value]) => {
        if (!acc[value.mode]) {
          acc[value.mode] = [];
        }
        acc[value.mode].push({ key, ...value });
        return acc;
      },
      {} as Record<string, Array<{ key: string; mode: string; shortcut: string; description: string }>>,
    );

    return (
      <List navigationTitle="Keyboard Shortcuts" searchBarPlaceholder="Search your shortcuts">
        {Object.entries(shortcutsByMode).map(([mode, shortcuts]) => (
          <List.Section key={mode} title={`${mode} binding mode`}>
            {shortcuts.map(({ key, shortcut, description }) => {
              const shortcutParts = shortcut.split("-");
              const modifiers = shortcutParts.slice(0, -1); // all parts except last as modifiers
              // Change alt to opt in modifiers using the normalizeKey function
              const normalizedModifiers = modifiers.map((modifier) => normalizeKey(modifier));
              // console.log("Modifiers:", modifiers);
              const keyPart = normalizeKey(shortcutParts[shortcutParts.length - 1]); // last part as key

              // Map keys and modifiers to symbols
              const mapKeyToSymbol = (key: string): string => {
                const keyMap: Record<string, string> = {
                  // Modifiers
                  cmd: "⌘",
                  alt: "⌥",
                  opt: "⌥",
                  option: "⌥",
                  ctrl: "⌃",
                  control: "⌃",
                  shift: "⇧",
                  // Special keys
                  space: "␣",
                  enter: "↩",
                  escape: "⎋",
                  backspace: "⌫",
                  tab: "⇥",
                  clear: "⌧",
                  decimal: ".",
                  divide: "÷",
                  "*": "×",
                  // Arrows
                  arrowleft: "←",
                  arrowdown: "↓",
                  arrowup: "↑",
                  arrowright: "→",
                };

                return keyMap[key.toLowerCase()] || key.toUpperCase();
              };

              const displayKey = mapKeyToSymbol(keyPart);
              // console.log("Key:", keyPart);
              // If the key is esc set it to nothing to avoid conflict with raycast api

              // Check if description has multiple commands
              let commands = description;
              if (typeof description === "string" && description.startsWith("[") && description.endsWith("]")) {
                commands = description
                  .slice(1, -1) // remove squarebrackets
                  .split(",")
                  .map((command) => command.trim())
                  .join(" & ");
              }

              // Build accessories array dynamically for modifiers using mapKeyToSymbol
              const uniqueSymbols = Array.from(
                new Set(normalizedModifiers.map((modifier) => mapKeyToSymbol(modifier))),
              );

              const keys = [
                ...["⌘", "⌥", "⌃", "⇧"].map((symbol) => ({
                  tag: {
                    value: symbol,
                    color: {
                      light: uniqueSymbols.includes(symbol) ? Color.PrimaryText : "transparent",
                      dark: uniqueSymbols.includes(symbol) ? Color.PrimaryText : "transparent",
                    },
                  },
                })),
                { tag: { value: displayKey as Keyboard.KeyEquivalent, color: Color.PrimaryText } },
              ];

              return (
                <List.Item
                  key={key}
                  icon={Icon.Keyboard}
                  title={commands}
                  subtitle={mode}
                  accessories={keys}
                  actions={
                    <ActionPanel>
                      <Action
                        title="Activate"
                        onAction={() => {
                          console.log("Activated", description);
                          executeShortcut(shortcut);
                        }}
                        shortcut={{
                          modifiers: normalizedModifiers.map((modifier) => modifier as Keyboard.KeyModifier),
                          key: keyPart === "escape" ? "home" : (keyPart as Keyboard.KeyEquivalent),
                        }}
                      />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        ))}
      </List>
    );
  }
}
