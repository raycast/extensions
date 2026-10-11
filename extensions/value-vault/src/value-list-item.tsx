import { Action, ActionPanel, Clipboard, Icon, Keyboard, List, showHUD, showToast, Toast } from "@raycast/api";
import { useCallback, useState } from "react";
import { ValueEntry } from "./types";
import { formatRelativeTime, getErrorMessage, truncateValue } from "./utils";
import EditValueForm from "./edit-value";

/** Metadata for each value type: icon, color, and display name. */
export const TYPE_META: Record<ValueEntry["type"], { icon: Icon; color: string; name: string }> = {
  string: { icon: Icon.Text, color: "#000000", name: "string" },
  number: { icon: Icon.Hashtag, color: "#007AFF", name: "number" },
  url: { icon: Icon.Link, color: "#007AFF", name: "URL" },
  email: { icon: Icon.Envelope, color: "#FF00FF", name: "email" },
  json: { icon: Icon.Code, color: "#FF9500", name: "JSON" },
  color: { icon: Icon.EyeDropper, color: "#FFCC00", name: "color" },
};

/** Generate searchable keywords from a value string for Raycast List filtering. */
function generateKeywords(value: string): string[] {
  const keywords: string[] = [value];

  const segments = value.split(/[\s/_.-]+/);
  for (const segment of segments) {
    if (segment.length > 2 && !keywords.includes(segment)) {
      keywords.push(segment);
    }
  }

  if (value.startsWith("http")) {
    try {
      const url = new URL(value);
      keywords.push(url.hostname);
      const domainParts = url.hostname.split(".");
      for (const part of domainParts) {
        if (part.length > 2 && !keywords.includes(part)) {
          keywords.push(part);
        }
      }
    } catch {
      // invalid URL
    }
  }

  return keywords;
}

interface ValueListItemProps {
  entry: ValueEntry;
  onDelete: (id: string, label: string) => Promise<void>;
  onDuplicate: (entry: ValueEntry) => Promise<void>;
  onUpdate: () => void;
}

export function ValueListItem({ entry, onDelete, onDuplicate, onUpdate }: ValueListItemProps) {
  const meta = TYPE_META[entry.type];
  // Previews stay masked until explicitly revealed; the flag is session-only
  // so a revealed secret never persists into the next Raycast launch.
  const [revealed, setRevealed] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await Clipboard.copy(entry.value);
      await showHUD("Copied!");
    } catch (e) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to copy value", message: getErrorMessage(e) });
    }
  }, [entry.value]);

  const handlePaste = useCallback(async () => {
    try {
      await Clipboard.paste(entry.value);
      await showHUD("Pasted!");
    } catch (e) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to paste value", message: getErrorMessage(e) });
    }
  }, [entry.value]);

  const handleCopyAsJson = useCallback(async () => {
    try {
      const json = JSON.stringify({ label: entry.label, value: entry.value, type: entry.type }, null, 2);
      await Clipboard.copy(json);
      await showHUD("Copied as JSON!");
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to copy as JSON",
        message: getErrorMessage(e),
      });
    }
  }, [entry.label, entry.value, entry.type]);

  const handleToggleReveal = useCallback(() => setRevealed((prev) => !prev), []);

  return (
    <List.Item
      key={entry.id}
      title={entry.label}
      subtitle={revealed ? truncateValue(entry.value) : "••••••••"}
      icon={{ source: meta.icon, tintColor: meta.color }}
      accessories={[{ tag: { value: meta.name, color: meta.color } }, { text: formatRelativeTime(entry.updatedAt) }]}
      keywords={generateKeywords(entry.value)}
      actions={
        <ActionPanel>
          <Action icon={Icon.Clipboard} title="Copy Value" onAction={handleCopy} />
          <Action
            icon={Icon.Eye}
            title={revealed ? "Hide Value" : "Show Value"}
            shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
            onAction={handleToggleReveal}
          />
          <Action
            icon={Icon.Terminal}
            title="Paste Value"
            shortcut={{ modifiers: ["cmd"], key: "return" }}
            onAction={handlePaste}
          />
          <Action
            icon={Icon.CopyClipboard}
            title="Copy as JSON"
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            onAction={handleCopyAsJson}
          />
          <Action.Push
            icon={Icon.Pencil}
            title="Edit Value"
            shortcut={{ modifiers: ["cmd"], key: "e" }}
            target={<EditValueForm entry={entry} onUpdate={onUpdate} />}
          />
          <Action
            icon={Icon.Duplicate}
            title="Duplicate"
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={() => onDuplicate(entry)}
          />
          <Action
            icon={Icon.Trash}
            title="Delete Value"
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            onAction={() => onDelete(entry.id, entry.label)}
          />
        </ActionPanel>
      }
    />
  );
}
