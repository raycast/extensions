import { Action, ActionPanel, Detail, List, showToast, Toast, useNavigation } from "@raycast/api";
import { TranslateListItemData } from "../service/type";
import { FunctionComponent, useCallback, useContext } from "react";
import { MessageContext } from "../context/MessageContext";

export const TranslateListItem: FunctionComponent<Props> = (props) => {
  const { item, onSave } = props;
  const { push } = useNavigation();
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
                <Action.CopyToClipboard
                  title={L.Copy}
                  content={item.text}
                  shortcut={{ modifiers: ["cmd"], key: "." }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      );
    }

    return showToast({
      style: Toast.Style.Failure,
      title: L.It_does_not_have_traslated_text,
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
            <Action title={L.View} onAction={onAction} />
            <Action title={L.Save} onAction={onSave} />
            <Action.CopyToClipboard
              title={L.Copy}
              content={item.text}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
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
