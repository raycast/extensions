import { List, ActionPanel, CopyToClipboardAction, OpenInBrowserAction } from "@raycast/api";

interface ListRowProps {
  title: string;
  value: string;
  link?: string;
}

export default function ListRow({ title, value, link }: ListRowProps) {
  const ListItemActions = (
    <ActionPanel>
      <CopyToClipboardAction content={value} />
      {link && <OpenInBrowserAction url={link} />}
    </ActionPanel>
  );

  return <List.Item title={title} accessoryTitle={value} actions={ListItemActions} />;
}
