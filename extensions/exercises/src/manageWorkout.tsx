import { List, ActionPanel, Action, showToast, Toast, LocalStorage, Icon, Alert, confirmAlert } from "@raycast/api";
import React, { useState, useEffect } from "react";
import { Workout } from "./interfaces/workout";
import { getWorkouts } from "./utils/workoutUtils";
import { WorkoutList } from "./components/WorkoutList";

export default function ManageWorkout() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);

  useEffect(() => {
    async function fetchWorkouts() {
      try {
        const fetchedWorkouts = await getWorkouts();
        console.log("Fetched workouts:", fetchedWorkouts);
        setWorkouts(fetchedWorkouts);
      } catch (error) {
        console.error("Error fetching workouts:", error instanceof Error ? error.message : String(error));
      } finally {
        setIsLoading(false);
      }
    }
    fetchWorkouts();
  }, []);

  async function deleteWorkout(workout: Workout) {
    const shouldDelete = await confirmAlert({
      title: "Delete Workout",
      message: `Are you sure you want to delete "${workout.name}"?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (shouldDelete) {
      const updatedWorkouts = workouts.filter((w) => w.name !== workout.name);
      await LocalStorage.setItem("workouts", JSON.stringify(updatedWorkouts));
      setWorkouts(updatedWorkouts);
      setSelectedWorkout(null);
      showToast({
        style: Toast.Style.Success,
        title: "Workout deleted",
        message: `Deleted workout: ${workout.name}`,
      });
    }
  }

  async function moveExercise(workoutIndex: number, exerciseIndex: number, direction: "up" | "down") {
    try {
      const newWorkouts = [...workouts];
      const workout = newWorkouts[workoutIndex];
      if (!workout || !workout.exerciseIds) {
        throw new Error("Invalid workout or exerciseIds");
      }
      const { exerciseIds } = workout;
      const newIndex = direction === "up" ? exerciseIndex - 1 : exerciseIndex + 1;

      if (newIndex >= 0 && newIndex < exerciseIds.length) {
        [exerciseIds[exerciseIndex], exerciseIds[newIndex]] = [exerciseIds[newIndex], exerciseIds[exerciseIndex]];
        await LocalStorage.setItem("workouts", JSON.stringify(newWorkouts));
        setWorkouts(newWorkouts);
        setSelectedWorkout({ ...workout });
      } else {
        throw new Error("Cannot move exercise outside of bounds");
      }
    } catch (error) {
      console.error("Error moving exercise:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to move exercise",
        message: (error as Error).message,
      });
    }
  }

  async function deleteExerciseFromWorkout(workoutIndex: number, exerciseIndex: number) {
    try {
      const newWorkouts = [...workouts];
      const workout = newWorkouts[workoutIndex];
      if (!workout || !workout.exerciseIds) {
        throw new Error("Invalid workout or exerciseIds");
      }
      workout.exerciseIds.splice(exerciseIndex, 1);
      await LocalStorage.setItem("workouts", JSON.stringify(newWorkouts));
      setWorkouts(newWorkouts);
      setSelectedWorkout({ ...workout });
      showToast({
        style: Toast.Style.Success,
        title: "Exercise removed",
        message: `Removed exercise from ${workout.name}`,
      });
    } catch (error) {
      console.error("Error deleting exercise:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete exercise",
        message: (error as Error).message,
      });
    }
  }

  if (selectedWorkout) {
    return (
      <List
        isLoading={isLoading}
        navigationTitle={selectedWorkout.name}
        actions={
          <ActionPanel>
            <Action title="Back to Workouts" onAction={() => setSelectedWorkout(null)} />
            <Action
              title="Delete Workout"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={() => deleteWorkout(selectedWorkout)}
            />
          </ActionPanel>
        }
      >
        {selectedWorkout.exerciseIds && selectedWorkout.exerciseIds.length > 0 ? (
          selectedWorkout.exerciseIds.map((exerciseId, index) => (
            <List.Item
              key={index}
              title={exerciseId}
              actions={
                <ActionPanel>
                  <Action
                    title="Move Up in Workout"
                    icon={Icon.ArrowUp}
                    onAction={() =>
                      moveExercise(
                        workouts.findIndex((w) => w.name === selectedWorkout.name),
                        index,
                        "up",
                      )
                    }
                    shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
                  />
                  <Action
                    title="Move Down in Workout"
                    icon={Icon.ArrowDown}
                    onAction={() =>
                      moveExercise(
                        workouts.findIndex((w) => w.name === selectedWorkout.name),
                        index,
                        "down",
                      )
                    }
                    shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
                  />
                  <Action
                    title="Remove From Workout"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() =>
                      deleteExerciseFromWorkout(
                        workouts.findIndex((w) => w.name === selectedWorkout.name),
                        index,
                      )
                    }
                    shortcut={{ modifiers: ["cmd", "opt"], key: "delete" }}
                  />
                </ActionPanel>
              }
            />
          ))
        ) : (
          <List.EmptyView title="No exercises in this workout" />
        )}
      </List>
    );
  }

  return (
    <WorkoutList
      workouts={workouts}
      isLoading={isLoading}
      onSelectWorkout={setSelectedWorkout}
      additionalActions={(workout) => (
        <Action
          title="Delete Workout"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          onAction={() => deleteWorkout(workout)}
        />
      )}
    />
  );
}
