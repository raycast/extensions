import { List } from "@raycast/api";
import { useLatestFeed } from "./apis";
import NoteListItem from "./components/NoteListItem";

export default function Command() {
  const { data: feeds, isLoading: isLoadingFeed } = useLatestFeed();

  return (
    <List isLoading={isLoadingFeed}>
      {feeds?.list.map(
        (feed) => feed.note && <NoteListItem key={`${feed.transactionHash}-${feed.logIndex}`} note={feed.note} />,
      )}
    </List>
  );
}
