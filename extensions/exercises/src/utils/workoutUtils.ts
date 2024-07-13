import { LocalStorage, showToast, Toast } from "@raycast/api";
import { Exercise } from "../interfaces/exercise";
import { Workout } from "../interfaces/workout";

export async function addExerciseToWorkout(exercise: Exercise, workoutName: string): Promise<void> {
  try {
    const workoutsJSON = await LocalStorage.getItem<string>("workouts");
    const workouts: Workout[] = workoutsJSON ? JSON.parse(workoutsJSON) : [];

    let workout = workouts.find((w) => w.name === workoutName);
    if (!workout) {
      workout = { name: workoutName, exerciseIds: [] };
      workouts.push(workout);
    }

    if (!workout.exerciseIds) {
      workout.exerciseIds = [];
    }

    if (!exercise.id) {
      throw new Error("Exercise ID is undefined");
    }

    if (!workout.exerciseIds.includes(exercise.id)) {
      workout.exerciseIds.push(exercise.id);
      await LocalStorage.setItem("workouts", JSON.stringify(workouts));
      await showToast({
        style: Toast.Style.Success,
        title: "Exercise added to workout",
        message: `${exercise.name} added to ${workoutName}`,
      });
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Exercise already in workout",
        message: `${exercise.name} is already in ${workoutName}`,
      });
    }
  } catch (error) {
    console.error("Error adding exercise to workout:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to add exercise",
      message: "An error occurred while adding the exercise to the workout",
    });
  }
}

export async function removeExerciseFromWorkout(exerciseId: string, workoutName: string): Promise<void> {
  try {
    const workoutsJSON = await LocalStorage.getItem<string>("workouts");
    if (!workoutsJSON) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Workout not found",
        message: "No workouts found in storage",
      });
      return;
    }

    const workouts: Workout[] = JSON.parse(workoutsJSON);
    const workout = workouts.find((w) => w.name === workoutName);

    if (!workout) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Workout not found",
        message: `Workout ${workoutName} not found`,
      });
      return;
    }

    const initialLength = workout.exerciseIds.length;
    workout.exerciseIds = workout.exerciseIds.filter((id) => id !== exerciseId);

    if (workout.exerciseIds.length === initialLength) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Exercise not found",
        message: `Exercise not found in ${workoutName}`,
      });
      return;
    }

    await LocalStorage.setItem("workouts", JSON.stringify(workouts));
    await showToast({
      style: Toast.Style.Success,
      title: "Exercise removed from workout",
      message: `Exercise removed from ${workoutName}`,
    });
  } catch (error) {
    console.error("Error removing exercise from workout:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to remove exercise",
      message: "An error occurred while removing the exercise from the workout",
    });
  }
}

export async function getWorkouts(): Promise<Workout[]> {
  const workoutsJson = await LocalStorage.getItem<string>("workouts");
  return workoutsJson ? JSON.parse(workoutsJson) : [];
}

export async function getExerciseById(id: string): Promise<Exercise | null> {
  console.log("Fetching exercise with ID:", id);
  const exercisesJson = await LocalStorage.getItem<string>("exercises");
  console.log("Exercises JSON:", exercisesJson);
  if (exercisesJson) {
    const exercises: Exercise[] = JSON.parse(exercisesJson);
    console.log("Parsed exercises:", exercises);
    const exercise = exercises.find((e) => e.id === id);
    console.log("Found exercise:", exercise);
    return exercise || null;
  }
  console.log("No exercises found in LocalStorage");
  return null;
}
