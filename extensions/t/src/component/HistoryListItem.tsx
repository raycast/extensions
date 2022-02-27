import { Action, ActionPanel, List } from "@raycast/api";
import { FunctionComponent, useContext } from "react";
import { MessageContext } from "../context/MessageContext";

export const HistoryListItem: FunctionComponent<Props> = (props) => {
  const { item, onSelect, onDelete } = props;
  const m = useContext(MessageContext);

  return (
    <List.Item
      title={item}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action title={m(l => l.view)} onAction={() => onSelect(item)} />
            <Action title={m(l => l.delete)} onAction={() => onDelete(item)} />
            <Action.CopyToClipboard title={m(l => l.copy)} content={item} shortcut={{ modifiers: ["cmd"], key: "." }} />
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
