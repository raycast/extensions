import ThreadList from "./thread-list";
import { liveThreads } from "./t3";

export default function Command() {
  return (
    <ThreadList
      select={(_threads, snapshot) => liveThreads(snapshot)}
      searchBarPlaceholder="Search threads by title, project or branch"
      emptyTitle="No threads"
      emptyDescription="This T3 Code environment has no live threads."
    />
  );
}
