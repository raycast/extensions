import { showHUD, LaunchProps } from "@raycast/api";
import { addTask } from "./api";

interface TaskArguments {
  taskInput: string;
}

export default async function Command(props: LaunchProps<{ arguments: TaskArguments }>) {
  const { taskInput } = props.arguments;
  try {
    await addTask(taskInput);
    await showHUD("Task added successfully");
  } catch (error) {
    if (error instanceof Error) {
      await showHUD(`Error adding task: ${error.message}`);
    } else {
      console.error(error);
      await showHUD("An unknown error occurred");
    }
  }
}
