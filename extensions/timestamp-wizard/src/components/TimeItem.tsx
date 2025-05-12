import { ActionPanel, Action, List } from "@raycast/api";
import { TimeItem as TimeItemType } from "../types";
import { useClipboard } from "../hooks/useClipboard";

/**
 * Time Item Display Component
 */
export const TimeItem: React.FC<{ item: TimeItemType }> = ({ item }) => {
  const { copyToClipboard } = useClipboard();

  if (!item.value) {
    return null;
  }

  return (
    <List.Item
      icon={item.icon}
      title={item.title}
      subtitle={item.subtitle}
      accessories={item.accessory ? [{ text: item.accessory }] : []}
      actions={
        <ActionPanel>
          {item.value && (
            <Action.CopyToClipboard
              title="Copy to Clipboard"
              content={item.value}
              onCopy={() => copyToClipboard(item.value)}
            />
          )}
        </ActionPanel>
      }
    />
  );
};
