import { Keyboard, MenuBarExtra } from "@raycast/api";
import { getConfig, handleConfigError } from "./utils/config";
import { executeShortcut, extractKeyboardShortcuts, groupShortcutsByMode } from "./utils/shortcuts";
import { normalizeKey } from "./utils/keys";

export default function Command() {
  const { config, error } = getConfig();
  if (error) {
    handleConfigError(error);
  }
  if (config) {
    const keyboardShortcuts = extractKeyboardShortcuts(config);
    const groupedShortcuts = groupShortcutsByMode(keyboardShortcuts);
    //   console.log(groupedShortcuts);

    return (
      <MenuBarExtra icon={"menubar-icon.png"} tooltip="Your Shortcuts">
        {Object.entries(groupedShortcuts).map(([key, value]) => {
          //Iterate over shortcuts
          return (
            <MenuBarExtra.Section key={key} title={key.charAt(0).toUpperCase() + key.slice(1)}>
              {value.map((shortcut) => {
                const shortcutParts = shortcut.shortcut.split("-");
                const modifiers = shortcutParts.slice(0, -1); // all parts except last as modifiers
                // Change alt to opt in modifiers using the normalizeKey function
                const normalizedModifiers = modifiers.map((modifier) => normalizeKey(modifier));
                // console.log("Modifiers:", modifiers);
                const keyPart = normalizeKey(shortcutParts[shortcutParts.length - 1]); // last part as key
                // console.log("Key:", keyPart);
                // If the key is esc set it to nothing to avoid conflict with raycast api

                return (
                  <MenuBarExtra.Item
                    key={shortcut.shortcut}
                    title={shortcut.description}
                    shortcut={{
                      modifiers: normalizedModifiers.map((modifier) => modifier as Keyboard.KeyModifier),
                      key: keyPart === "escape" ? "home" : (keyPart as Keyboard.KeyEquivalent),
                    }}
                    onAction={() => {
                      console.log("Activated", shortcut.description);
                      executeShortcut(shortcut.shortcut);
                    }}
                  />
                );
              })}
            </MenuBarExtra.Section>
          );
        })}
      </MenuBarExtra>
    );
  }
}
