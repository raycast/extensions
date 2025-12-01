import { List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getRoutines } from "./lib/api";

export default function Command() {
  const { data, isLoading } = usePromise(() => getRoutines());

  return (
    <List isLoading={isLoading}>
      {data?.routines.map((routine) => (
        <List.Item
          key={routine.id}
          title={routine.title}
          subtitle={routine.created_at}
          accessories={[{ text: `${routine.exercises.length} exercises` }]}
        />
      ))}
    </List>
  );
}
