import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { removeItemFromHistory, removeAllItemsFromHistory, getHistory } from "../storage/history.storage";
import type { HistoryItem } from "../storage/history.storage";
import { useId } from "react";
import { EntityType } from "../interfaces";

interface HistoryListItemProps {
  item: HistoryItem;
  type: EntityType;
  setHistory: React.Dispatch<React.SetStateAction<HistoryItem[]>>;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
}
export const HistoryListItem = ({ item, type, setHistory, setSearchTerm }: HistoryListItemProps) => {
  const id = useId();
  return (
    <List.Item
      title={item.term}
      key={id}
      icon={item.type === "model" ? Icon.MagnifyingGlass : Icon.Box}
      actions={
        <ActionPanel>
          <Action title="Search Model" onAction={() => setSearchTerm(item.term)} icon={Icon.MagnifyingGlass} />
          <Action
            title="Remove From History"
            onAction={async () => {
              const history = await removeItemFromHistory(item);
              setHistory(history);
            }}
            icon={Icon.XMarkCircle}
            style={Action.Style.Destructive}
          />
          <Action
            title="Clear All Items From History"
            shortcut={{ modifiers: ["cmd"], key: "backspace" }}
            onAction={async () => {
              await removeAllItemsFromHistory(type);
              const history = await getHistory(type);
              setHistory(history);
            }}
            icon={Icon.XMarkCircleFilled}
            style={Action.Style.Destructive}
          />
        </ActionPanel>
      }
      accessories={[
        {
          icon: Icon.ArrowRightCircle,
          tooltip: "Search for this model",
        },
      ]}
    />
  );
};
