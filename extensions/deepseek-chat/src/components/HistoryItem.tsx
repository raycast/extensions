import { List, ActionPanel, Action, Icon } from "@raycast/api";
import type { HistoryEntry } from "../hooks/useHistory";

interface HistoryItemProps {
  entry: HistoryEntry;
}

export function HistoryItem({ entry }: HistoryItemProps) {
  const preview =
    entry.answer.length > 80 ? entry.answer.slice(0, 80) + "..." : entry.answer;

  return (
    <List.Item
      title={entry.question}
      subtitle={preview}
      icon={Icon.Clock}
      detail={<List.Item.Detail markdown={entry.answer} />}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={entry.answer} title="Copy Answer" />
        </ActionPanel>
      }
    />
  );
}
