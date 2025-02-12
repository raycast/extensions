import { Action, ActionPanel, List } from "@raycast/api";

const StatsListItem = (props: { label: string; value: string }) => {
  return (
    <List.Item
      title={props.label}
      subtitle={props.value}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title={`Copy ${props.label}`} content={props.value} />
        </ActionPanel>
      }
    />
  );
};

export default StatsListItem;
