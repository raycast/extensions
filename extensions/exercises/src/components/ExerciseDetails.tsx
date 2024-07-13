import React, { useState, useEffect } from "react";
import { Detail, ActionPanel, Action, useNavigation, Form } from "@raycast/api";
import { moveFavorite, removeFavorite, getExerciseLabels } from "../utils";
import { addExerciseToWorkout, getWorkouts } from "../utils/workoutUtils";
import ExerciseList from "../index";
import { Exercise } from "../interfaces/exercise";
import { Workout } from "../interfaces/workout";

interface ExerciseDetailsProps {
  exercise: Exercise;
  favorites: string[];
  setFavorites: (favorites: string[]) => void;
  updateFavorites: (newFavorites: string[]) => Promise<void>;
  setSelectedTag: (tag: string) => void;
  metadata?: React.ReactNode;
  actions?: React.ReactNode;
}

export default function ExerciseDetails({
  exercise,
  favorites,
  setFavorites,
  updateFavorites,
  setSelectedTag,
  metadata,
  actions,
}: ExerciseDetailsProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(favorites.includes(exercise.name));
  const [contentState, setContentState] = useState<string>("");
  const { push } = useNavigation();
  const [workouts, setWorkouts] = useState<Workout[]>([]);

  useEffect(() => {
    getWorkouts().then(setWorkouts);
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % exercise.images.length);
    }, 1000); // Change image every 1000 milliseconds (1 second)

    return () => clearInterval(intervalId); // Clear interval on component unmount
  }, [exercise.images.length]);

  useEffect(() => {
    setIsFavorite(favorites.includes(exercise.name));
  }, [favorites, exercise.name]);

  useEffect(() => {
    setContentState(
      `![img](https://raw.githubusercontent.com/yuhonas/free-exercise-db/5197c055b356498944328bd00178b64a5e9f422c/exercises/${exercise.images[currentImageIndex]}?raycast-width=300)\n\n
${getExerciseLabels(exercise)}\n  
## ${exercise.subtitle}\n${exercise.new_instructions}\n\n${exercise.tip}`,
    );
  }, [isFavorite, currentImageIndex, exercise]);

  const handleTagClick = (tag: string) => {
    console.log(`Tag ${tag} clicked`);
    setSelectedTag(tag);
    push(<ExerciseList initialSelectedTag={tag} />);
  };

  return (
    <Detail
      markdown={contentState}
      navigationTitle={exercise.name}
      metadata={
        metadata || (
          <Detail.Metadata>
            <Detail.Metadata.TagList title="Tags">
              {exercise.tags.map((tag, index) => (
                <Detail.Metadata.TagList.Item key={`${tag}-${index}`} text={tag} onAction={() => handleTagClick(tag)} />
              ))}
            </Detail.Metadata.TagList>
            <Detail.Metadata.Separator />

            <Detail.Metadata.Label title="Level" text={`${exercise.level}`} />
            <Detail.Metadata.Label title="Equipment" text={`${exercise.equipment}`} />
            <Detail.Metadata.Label title="Category" text={`${exercise.category}`} />
            <Detail.Metadata.Label title="Primary Muscles" text={`${exercise.primaryMuscles}`} />
            <Detail.Metadata.Label title="Secondary Muscles" text={`${exercise.secondaryMuscles}`} />
            <Detail.Metadata.Label title="Force" text={`${exercise.force}`} />
          </Detail.Metadata>
        )
      }
      actions={
        actions || (
          <ActionPanel>
            <Action
              title="Move up in Favorites"
              onAction={() => moveFavorite(exercise.name, "up", favorites, setFavorites, updateFavorites)}
              shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
            />
            <Action
              title="Move Down in Favorites"
              onAction={() => moveFavorite(exercise.name, "down", favorites, setFavorites, updateFavorites)}
              shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
            />
            <Action
              title="Remove From Favorites"
              onAction={() => removeFavorite(exercise.name, favorites, setFavorites, updateFavorites)}
              shortcut={{ modifiers: ["cmd", "opt"], key: "x" }}
            />
            <ActionPanel.Submenu title="Add to Workout">
              {workouts.map((workout) => (
                <Action
                  key={workout.name}
                  title={`Add to ${workout.name}`}
                  onAction={() => addExerciseToWorkout(exercise, workout.name)}
                />
              ))}
              <Action.Push title="Create New Workout" target={<CreateWorkoutForm exercise={exercise} />} />
            </ActionPanel.Submenu>
          </ActionPanel>
        )
      }
    />
  );
}

function CreateWorkoutForm({ exercise }: { exercise: Exercise }) {
  const [workoutName, setWorkoutName] = useState("");

  const handleSubmit = async () => {
    if (workoutName.trim()) {
      await addExerciseToWorkout(exercise, workoutName.trim());
      // Optionally, you can navigate back or show a success message
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Workout" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="workoutName" title="Workout Name" value={workoutName} onChange={setWorkoutName} />
    </Form>
  );
}
