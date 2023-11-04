import { List } from "@raycast/api";
import { usePromise } from "@raycast/utils";

import { ListItemNote } from "@/components/ListItemNote";
import { getNotes } from "@/lib/dcli";

export default function Command() {
  const { data, isLoading } = usePromise(getNotes);

  return (
    <List isLoading={isLoading} navigationTitle="Search Notes" searchBarPlaceholder="Search your notes" isShowingDetail>
      {data && data.map((note) => <ListItemNote key={note.id} note={note} />)}
    </List>
  );
}
