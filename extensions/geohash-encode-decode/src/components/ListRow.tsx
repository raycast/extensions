import { List, ActionPanel, CopyToClipboardAction } from "@raycast/api";

interface ListRowProps {
  title: string;
  value: string;
}

export default function ListRow({ title, value }: ListRowProps) {
  const ListItemActions = <ActionPanel>
    <CopyToClipboardAction content={value} />
  </ActionPanel>;

  return (
    <List.Item title={title} accessoryTitle={value} actions={ListItemActions} />
  );
}
