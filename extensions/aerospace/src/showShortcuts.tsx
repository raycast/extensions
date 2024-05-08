/* eslint-disable @typescript-eslint/no-explicit-any */
import { Action, ActionPanel, Keyboard, List } from "@raycast/api";
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

    return (
      <List navigationTitle="Keyboard Shortcuts" searchBarPlaceholder="Search your shortcuts">
        {Object.entries(keyboardShortcuts).map(([key, value]) => {
          const shortcutParts = value.shortcut.split("-");
          const modifiers = shortcutParts.slice(0, -1); // all parts except last as modifiers
          // Change alt to opt in modifiers using the normalizeKey function
          const normalizedModifiers = modifiers.map((modifier) => normalizeKey(modifier));
          // console.log("Modifiers:", modifiers);
          const keyPart = normalizeKey(shortcutParts[shortcutParts.length - 1]); // last part as key
          // console.log("Key:", keyPart);
          // If the key is esc set it to nothing to avoid conflict with raycast api

          return (
            <List.Item
              key={key}
              icon={"list-icon.png"}
              title={value.description}
              subtitle={value.shortcut}
              accessories={[{ text: value.mode }]}
              actions={
                <ActionPanel>
                  <Action
                    title="Activate"
                    onAction={() => {
                      console.log("Activated", value.description);
                      executeShortcut(value.shortcut);
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
      </List>
    );
  }
}
