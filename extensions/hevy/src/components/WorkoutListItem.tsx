import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { Workout } from "../lib/types";
import { formatDate, formatTime } from "../lib/helpers/dates";
import { formatWorkoutDuration } from "../lib/helpers/durations";
import { calculateTotalVolume, formatVolume } from "../lib/helpers/formatters";
import { getWorkoutIcon } from "../lib/helpers/icons";
import WorkoutDetail from "./WorkoutDetail";

type WorkoutListItemProps = {
  workout: Workout;
};

export default function WorkoutListItem({ workout }: WorkoutListItemProps) {
  const exerciseCount = workout.exercises.length;
  const totalSets = workout.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);
  const duration = formatWorkoutDuration(workout.start_time, workout.end_time);
  const totalVolume = calculateTotalVolume(workout.exercises);

  const keywords = [workout.title, workout.id];
  if (workout.routine_id) {
    keywords.push(workout.routine_id);
  }
  workout.exercises.forEach((exercise) => {
    keywords.push(exercise.title);
  });

  const subtitle = `${formatDate(workout.start_time)} • ${formatTime(workout.start_time)} • ${duration}`;

  const accessories: List.Item.Accessory[] = [
    {
      text: `${exerciseCount} ${exerciseCount === 1 ? "exercise" : "exercises"}`,
      tooltip: `Total exercises: ${exerciseCount}`,
    },
    {
      text: `${totalSets} ${totalSets === 1 ? "set" : "sets"}`,
      tooltip: `Total sets: ${totalSets}`,
    },
    ...(totalVolume > 0
      ? [
          {
            icon: Icon.Weights,
            text: formatVolume(totalVolume),
            tooltip: `Total volume: ${formatVolume(totalVolume)}`,
          } as List.Item.Accessory,
        ]
      : []),
  ];

  return (
    <List.Item
      key={workout.id}
      title={workout.title}
      icon={getWorkoutIcon()}
      subtitle={subtitle}
      keywords={keywords}
      accessories={accessories}
      actions={
        <ActionPanel title={workout.title}>
          <Action.Push title="Show Details" icon={Icon.Sidebar} target={<WorkoutDetail workout={workout} />} />
        </ActionPanel>
      }
    />
  );
}
