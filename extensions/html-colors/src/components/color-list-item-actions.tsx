import { ActionPanel, Action } from "@raycast/api";
import { useCallback } from "react";
import type { ColorWithCategories } from "../types";

/**
 * Actions panel component for color list items.
 * Provides actions for copying color values and toggling display options.
 */
export function ColorListItemActions({
  color,
  onSelect,
  showHex,
  onToggleFormat,
  isDetailVisible,
  onToggleDetail,
}: {
  color: ColorWithCategories;
  onSelect: (color: ColorWithCategories) => void;
  showHex: boolean;
  onToggleFormat: () => void;
  isDetailVisible: boolean;
  onToggleDetail: () => void;
}) {
  const handleHexCopy = useCallback(() => {
    onSelect({ ...color, format: "hex" });
  }, [color, onSelect]);

  const handleRgbCopy = useCallback(() => {
    onSelect({ ...color, format: "rgb" });
  }, [color, onSelect]);

  const handleNameCopy = useCallback(() => {
    onSelect({ ...color, format: "name" });
  }, [color, onSelect]);

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {/* eslint-disable-next-line @raycast/prefer-title-case -- HEX is an abbreviation */}
        <Action title="Copy HEX to Clipboard" onAction={handleHexCopy} />
        {/* eslint-disable-next-line @raycast/prefer-title-case -- RGB is an abbreviation */}
        <Action title="Copy RGB to Clipboard" onAction={handleRgbCopy} />
        <Action title="Copy Name to Clipboard" onAction={handleNameCopy} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title={`Show ${showHex ? "RGB" : "HEX"}`}
          onAction={onToggleFormat}
          shortcut={{ modifiers: ["cmd"], key: "t" }}
        />
        <Action
          title={isDetailVisible ? "Hide Details" : "Show Details"}
          onAction={onToggleDetail}
          shortcut={{ modifiers: ["cmd"], key: "i" }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
