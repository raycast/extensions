import { Action, ActionPanel, List } from "@raycast/api";
import { FunctionComponent, useContext } from "react";
import { MessageContext } from "../context/MessageContext";

export const HistoryListItem: FunctionComponent<Props> = (props) => {
  const { item, onSelect, onDelete } = props;
  
  return (
    <List.Item
      title={item}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action title={L.View} onAction={() => onSelect(item)} />
            <Action title={L.Delete} onAction={() => onDelete(item)} />
            <Action.CopyToClipboard
              title={L.Copy}
              content={item}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};

type Props = {
  item: string;
  onSelect(text: string): void;
  onDelete(text: string): void;
};
