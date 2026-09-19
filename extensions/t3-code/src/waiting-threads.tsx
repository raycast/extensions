import ThreadList from "./thread-list";
import { waitingThreads } from "./t3";

export default function Command() {
  return (
    <ThreadList
      select={(_threads, snapshot) => waitingThreads(snapshot)}
      searchBarPlaceholder="Filter threads waiting on you"
      emptyTitle="Nothing waiting"
      emptyDescription="Every active thread is either running or settled."
    />
  );
}
