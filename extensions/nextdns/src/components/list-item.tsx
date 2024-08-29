import { ActionPanel, Color, Icon, List } from "@raycast/api";

export function ListItem(props: { id: string; active: boolean }) {
  const { id, active } = props;
  return (
    <List.Item
      id={id}
      key={id}
      title={`*.${id}`}
      icon={
        active
          ? { source: Icon.CheckCircle, tintColor: Color.Green }
          : { source: Icon.Circle, tintColor: Color.SecondaryText }
      }
      actions={<ActionPanel title={`Manage ${id}`}></ActionPanel>}
    />
  );
}
