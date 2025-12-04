import { List, ActionPanel, CopyToClipboardAction, OpenInBrowserAction } from "@raycast/api";
import { afterActionHandler } from "../helpers/actions";

interface ListRowProps {
  title: string;
  value: string;
  link?: string;
}

export default function ListRow({ title, value, link }: ListRowProps) {
  const ListItemActions = (
    <ActionPanel>
      <CopyToClipboardAction content={value} onCopy={afterActionHandler} />
      {link && <OpenInBrowserAction url={link} onOpen={afterActionHandler} />}
    </ActionPanel>
  );

  return <List.Item title={title} accessoryTitle={value} actions={ListItemActions} />;
}
