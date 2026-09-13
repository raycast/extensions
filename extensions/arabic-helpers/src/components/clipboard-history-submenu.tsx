import { Action, ActionPanel, Clipboard, Icon } from "@raycast/api";
import { useState } from "react";

type ClipboardHistorySubmenuProps = {
  targetLabel: string;
  onSelect: (text: string) => void;
};

function createPreview(text: string): string {
  const singleLine = text.replace(/\s+/g, " ").trim();
  if (singleLine.length <= 80) return singleLine;
  return `${singleLine.slice(0, 77)}…`;
}

export function ClipboardHistorySubmenu({ targetLabel, onSelect }: ClipboardHistorySubmenuProps) {
  const [items, setItems] = useState<string[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadHistory = async () => {
    setHasLoaded(false);
    const history = await Promise.all(
      Array.from({ length: 6 }, (_, offset) => Clipboard.readText({ offset }).catch(() => undefined)),
    );
    const uniqueTextItems = [...new Set(history.filter((text): text is string => Boolean(text)))];
    setItems(uniqueTextItems);
    setHasLoaded(true);
  };

  return (
    <ActionPanel.Submenu title={`Show Recent Clipboard for ${targetLabel}`} icon={Icon.Clipboard} onOpen={loadHistory}>
      {items.map((text, index) => (
        <Action
          key={`${index}-${text}`}
          title={createPreview(text) || "Whitespace-only text"}
          icon={Icon.Clipboard}
          onAction={() => onSelect(text)}
        />
      ))}
      {hasLoaded && items.length === 0 ? <Action title="No Recent Clipboard Text" icon={Icon.Warning} /> : null}
      {!hasLoaded ? <Action title="Loading Recent Clipboard…" icon={Icon.Clock} /> : null}
    </ActionPanel.Submenu>
  );
}
