import { List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getWorkouts } from "./lib/api";

export default function Command() {
  const { data, isLoading } = usePromise(() => getWorkouts());

  return (
    <List isLoading={isLoading}>
      {data?.workouts.map((workout) => (
        <List.Item
          key={workout.id}
          title={workout.title}
          subtitle={workout.created_at}
          accessories={[{ text: `${workout.exercises.length} exercises` }]}
        />
      ))}
    </List>
  );
}
