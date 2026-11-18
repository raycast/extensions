import { List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getWorkouts } from "./lib/api";
import WorkoutListItem from "./components/WorkoutListItem";

export default function Command() {
  const { data, isLoading } = usePromise(() => getWorkouts());

  return (
    <List isLoading={isLoading}>
      {data?.workouts.map((workout) => (
        <WorkoutListItem key={workout.id} workout={workout} />
      ))}
    </List>
  );
}
