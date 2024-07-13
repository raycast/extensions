import { useState, useEffect } from "react";
import { Detail, ActionPanel, Action, useNavigation } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import { Workout } from "./interfaces/workout";
import { Exercise } from "./interfaces/exercise";
import { getWorkouts } from "./utils/workoutUtils";
import { getExerciseById } from "./utils/exerciseUtils";
import { WorkoutList } from "./components/WorkoutList";
import ExerciseDetails from "./components/ExerciseDetails";
import { WorkoutCompletionScreen } from "./components/WorkoutCompletionScreen";

export default function DoWorkout() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  useEffect(() => {
    async function fetchWorkouts() {
      try {
        const fetchedWorkouts = await getWorkouts();
        setWorkouts(fetchedWorkouts);
      } catch (error) {
        console.error("Error fetching workouts:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchWorkouts();
  }, []);

  return (
    <WorkoutList
      workouts={workouts}
      isLoading={isLoading}
      onSelectWorkout={(workout) => push(<WorkoutOverview workout={workout} />)}
    />
  );
}

function WorkoutOverview({ workout }: { workout: Workout }) {
  const { push } = useNavigation();

  return (
    <Detail
      markdown={`# ${workout.name}\n\n${workout.description || ""}\n\nThis workout has ${workout.exerciseIds.length} exercises:\n${workout.exerciseIds.map((exercise, index) => `${index + 1}. ${exercise}`).join("\n")}
      `}
      actions={
        <ActionPanel>
          <Action title="Start Workout" onAction={() => push(<ActiveWorkout workout={workout} />)} />
        </ActionPanel>
      }
    />
  );
}
function ActiveWorkout({ workout }: { workout: Workout }) {
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    async function fetchExercises() {
      try {
        const fetchedExercises = await Promise.all(workout.exerciseIds.map((id) => getExerciseById(id)));
        const validExercises = fetchedExercises.filter((exercise): exercise is Exercise => exercise !== undefined);
        setExercises(validExercises);
      } catch (error) {
        console.error("Error fetching exercises:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchExercises();
  }, [workout]);

  const currentExercise = exercises[currentExerciseIndex];
  const isFirstExercise = currentExerciseIndex === 0;
  const isLastExercise = currentExerciseIndex === exercises.length - 1;
  const progress = exercises.length > 0 ? (currentExerciseIndex + 1) / exercises.length : 0;

  if (isLoading) {
    return <Detail isLoading={true} />;
  }

  if (isCompleted) {
    return <WorkoutCompletionScreen workout={workout} />;
  }

  if (exercises.length === 0) {
    return <Detail markdown="No exercises found in this workout." />;
  }

  return (
    <ExerciseDetails
      exercise={currentExercise}
      favorites={[]}
      setFavorites={() => {}}
      updateFavorites={async () => {}}
      setSelectedTag={() => {}}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Progress"
            text={`${currentExerciseIndex + 1} / ${exercises.length}`}
            icon={getProgressIcon(progress)}
          />
          <Detail.Metadata.TagList title="Workout">
            <Detail.Metadata.TagList.Item text={workout.name} />
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            title={isLastExercise ? "Complete Workout" : "Next Exercise"}
            onAction={() => {
              if (isLastExercise) {
                setIsCompleted(true);
              } else {
                setCurrentExerciseIndex((prev) => prev + 1);
              }
            }}
            shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
          />
          {!isFirstExercise && (
            <Action
              title="Previous Exercise"
              onAction={() => setCurrentExerciseIndex((prev) => prev - 1)}
              shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
