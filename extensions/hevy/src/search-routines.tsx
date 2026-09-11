import { List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getRoutines } from "./lib/api";
import RoutineListItem from "./components/RoutineListItem";

export default function Command() {
  const { data, isLoading } = usePromise(() => getRoutines());

  return (
    <List isLoading={isLoading}>
      {data?.routines.map((routine) => (
        <RoutineListItem key={routine.id} routine={routine} />
      ))}
    </List>
  );
}
