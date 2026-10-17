import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import { DateFormatSlot } from "../lib/parse-settings";

/**
 * Format switching section, shown only when more than one format is set.
 * Formats are switched with the bare number keys, like the Obsidian plugin.
 */
export function formatActions(formats: DateFormatSlot[], activeIndex: number, onSelect: (index: number) => void) {
  if (formats.length < 2) return null;
  return (
    <ActionPanel.Section title="Format">
      {formats.map((slot, index) => (
        <Action
          key={slot.number}
          title={`Use Date Format ${slot.number} (${slot.pattern})`}
          icon={index === activeIndex ? Icon.CheckCircle : Icon.Circle}
          shortcut={{ modifiers: [], key: String(slot.number) as Keyboard.KeyEquivalent }}
          onAction={() => onSelect(index)}
        />
      ))}
    </ActionPanel.Section>
  );
}
