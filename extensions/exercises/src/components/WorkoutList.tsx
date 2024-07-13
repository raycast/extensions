import React from "react";
import { List, ActionPanel, Action } from "@raycast/api";
import { Workout } from "../interfaces/workout";

interface WorkoutListProps {
  workouts: Workout[];
  isLoading: boolean;
  onSelectWorkout: (workout: Workout) => void;
  additionalActions?: (workout: Workout) => React.ReactNode;
}

export function WorkoutList({ workouts, isLoading, onSelectWorkout, additionalActions }: WorkoutListProps) {
  return (
    <List isLoading={isLoading}>
      {workouts.map((workout, index) => (
        <List.Item
          key={index}
          title={workout.name}
          subtitle={`Exercises: ${workout.exerciseIds?.length || 0} (${workout.exerciseIds?.join(", ") || ""})`}
          actions={
            <ActionPanel>
              <Action title="Select Workout" onAction={() => onSelectWorkout(workout)} />
              {additionalActions && additionalActions(workout)}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
