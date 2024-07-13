import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  LocalStorage,
  List,
  Icon,
  Alert,
  confirmAlert,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { Workout } from "./interfaces/workout";

export default function CreateWorkout() {
  const [workout, setWorkout] = useState<Workout>({
    name: "",
    description: "",
    exerciseIds: [],
  });
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadWorkouts();
  }, []);

  async function loadWorkouts(): Promise<void> {
    const storedWorkouts = await LocalStorage.getItem<string>("workouts");
    if (storedWorkouts) {
      setWorkouts(JSON.parse(storedWorkouts));
    } else {
      // If no workouts are stored, ensure we're using an empty array
      setWorkouts([]);
    }
  }

  async function saveWorkout(newWorkout: Workout): Promise<void> {
    // Check for similar names
    const similarWorkout = workouts.find((w) => w.name.toLowerCase() === newWorkout.name.toLowerCase());
    if (similarWorkout) {
      showToast({
        style: Toast.Style.Failure,
        title: "Similar workout exists",
        message: `A workout named "${similarWorkout.name}" already exists.`,
      });
      return;
    }

    const updatedWorkouts = [...workouts, newWorkout];
    await LocalStorage.setItem("workouts", JSON.stringify(updatedWorkouts));
    setWorkouts(updatedWorkouts);
    showToast({
      style: Toast.Style.Success,
      title: "Workout created",
      message: `Created workout: ${newWorkout.name}`,
    });
    setShowForm(false);
    setWorkout({ name: "", description: "", exerciseIds: [] });
  }

  async function deleteWorkout(index: number): Promise<void> {
    const workoutToDelete = workouts[index];
    const shouldDelete = await confirmAlert({
      title: "Delete Workout",
      message: `Are you sure you want to delete "${workoutToDelete.name}"?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (shouldDelete) {
      const updatedWorkouts = workouts.filter((_, i) => i !== index);
      await LocalStorage.setItem("workouts", JSON.stringify(updatedWorkouts));
      setWorkouts(updatedWorkouts);
      showToast({
        style: Toast.Style.Success,
        title: "Workout deleted",
        message: `Deleted workout: ${workoutToDelete.name}`,
      });
    }
  }

  if (!showForm) {
    return (
      <List
        actions={
          <ActionPanel>
            <Action title="Create New Workout" onAction={() => setShowForm(true)} />
          </ActionPanel>
        }
      >
        {workouts.map((w, index) => (
          <List.Item
            key={index}
            title={w.name}
            subtitle={w.description}
            actions={
              <ActionPanel>
                <Action title="Create New Workout" onAction={() => setShowForm(true)} />
                <Action
                  title="Delete Workout"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => deleteWorkout(index)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List>
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Workout" onSubmit={saveWorkout} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Workout Name"
        placeholder="Enter workout name"
        value={workout.name}
        onChange={(name) => setWorkout({ ...workout, name })}
      />
      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Enter workout description"
        value={workout.description}
        onChange={(description) => setWorkout({ ...workout, description })}
      />
      {/* You'll need to implement a way to add exercises here */}
    </Form>
  );
}
