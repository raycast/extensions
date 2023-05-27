import { List, ActionPanel, Action } from "@raycast/api";

export const ActionListSection = ({
  title,
  text,
  needFormat = false,
}: {
  title: string;
  text: string;
  needFormat?: boolean;
}) => {
  return (
    <List.Section title={title}>
      <List.Item
        title={text}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content={needFormat ? JSON.stringify(JSON.parse(text), null, 2) : text} />
          </ActionPanel>
        }
      />
    </List.Section>
  );
};
