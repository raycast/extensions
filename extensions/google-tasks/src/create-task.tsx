import { Toast, showToast } from "@raycast/api";
import CreateTaskForm from "./components/CreateTaskForm";
import { createTask } from "./api/endpoints";
import { TaskForm } from "./types";
import { GoogleAuthProvider } from "./contexts/GoogleAuthProvider";

function CreateTaskCommand() {
  const handleCreate = async (listId: string, task: TaskForm) => {
    try {
      await createTask(listId, task);
    } catch (error) {
      console.error(error);
      showToast({ style: Toast.Style.Failure, title: String(error) });
    }
  };

  return <CreateTaskForm onCreate={handleCreate} />;
}

export default function Command() {
  return (
    <GoogleAuthProvider>
      <CreateTaskCommand />
    </GoogleAuthProvider>
  );
}
