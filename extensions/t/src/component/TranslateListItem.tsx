import { Action, ActionPanel, Detail, List, showToast, Toast, useNavigation } from "@raycast/api";
import { TranslateListItemData } from "../service/type";
import { FunctionComponent, useCallback, useContext } from "react";
import { MessageContext } from "../context/MessageContext";

export const TranslateListItem: FunctionComponent<Props> = (props) => {
  const { item, onSave } = props;
  const { push } = useNavigation();
  const m = useContext(MessageContext)
  const onAction = useCallback(() => {
    if (item.text) {
      // todo: support URL
      return push(
        <Detail
          markdown={item.text}
          navigationTitle={item.service}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.CopyToClipboard title={m(l => l.Copy)} content={item.text} shortcut={{ modifiers: ["cmd"], key: "." }} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      );
    }

    return showToast({
      style: Toast.Style.Failure,
      title: m(l => l.ItDoesNotHaveTraslatedText),
    });
  }, [item]);

  return (
    <List.Item
      title={item.text || "..."}
      icon={item.icon}
      accessoryTitle={item.service}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action title={m(l => l.View)} onAction={onAction} />
            <Action title={m(l => l.Save)} onAction={onSave} />
            <Action.CopyToClipboard title={m(l => l.Copy)} content={item.text} shortcut={{ modifiers: ["cmd"], key: "." }} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};

type Props = {
  item: TranslateListItemData;
  onSave(): void;
};
