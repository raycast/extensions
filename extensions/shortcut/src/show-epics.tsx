import { List } from "@raycast/api";
import EpicListItem from "./components/EpicListItem";
import { useEpics } from "./hooks";

export default function ShowEpics() {
  const { data: epics, isLoading, error } = useEpics();

  return (
    <List isLoading={isLoading && !error}>
      {error && <List.EmptyView title="Error" description={error.message} />}

      {!error && epics?.sort((a, b) => a.position - b.position).map((epic) => <EpicListItem epic={epic} />)}
    </List>
  );
}
