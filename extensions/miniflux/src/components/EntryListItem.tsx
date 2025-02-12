import { List } from "@raycast/api";
import { MinifluxEntry } from "../utils/types";
import { useEntryIcon } from "../utils/useEntryIcon";
import ControlActions from "./ControlActions";

const EntryListItem = ({ entry }: { entry: MinifluxEntry }) => {
  const icon = useEntryIcon(entry);

  return (
    <List.Item
      key={entry.id}
      title={entry.title}
      keywords={[...entry.title]}
      icon={icon}
      accessories={[{ text: entry.feed.title }]}
      actions={<ControlActions entry={entry} />}
    />
  );
};

export default EntryListItem;
