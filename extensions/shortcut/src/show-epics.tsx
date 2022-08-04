import { List } from "@raycast/api";
import EpicListItem from "./components/EpicListItem";
import { useEpics } from "./hooks";

export default function ShowEpics() {
  const { data: epics, isLoading } = useEpics();

  return (
    <List isLoading={isLoading}>
      {epics
        ?.sort((a, b) => a.position - b.position)
        .map((epic) => (
          <EpicListItem epic={epic} />
        ))}
    </List>
  );
}
