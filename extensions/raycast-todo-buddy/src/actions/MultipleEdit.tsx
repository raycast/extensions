import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { FC } from "react";
import { DifficultyIconMap } from "../constants";
import ListTasks from "../list-tasks";
import { getAllTags, updateTask } from "../storage";
import { Tag, Task } from "../types";

type MultipleEditProps = {
  oldTask: Task;
  refetchList: () => void;
};
export function MultipleEdit({ oldTask, refetchList }: MultipleEditProps) {
  const { isLoading, data } = useCachedPromise(getAllTags, [], {
    initialData: [],
  });
  const { push } = useNavigation();
  async function handleUpdate(task: Task) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Updating a Task...",
      message: task.text,
    });
    try {
      const localDateString = task.date ? new Date(task.date).toLocaleString() : undefined;
      await updateTask(oldTask.id, {
        text: task.text,
        difficulty: task.difficulty,
        date: localDateString,
        tags: task.tags,
        completed: oldTask.completed,
        pinned: oldTask.pinned,
      });
      toast.style = Toast.Style.Success;
      toast.title = "Updated a Task";
      refetchList();
      push(<ListTasks initialSearchText={""} />);
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to update a Task";
      if (e instanceof Error) {
        toast.message = e.message;
      }
    }
  }

  return (
    <>
      <UpdateTodoForm oldTask={oldTask} onUpdate={handleUpdate} tags={data} isLoading={isLoading} />
    </>
  );
}

type Props = {
  oldTask: Task;
  isLoading: boolean;
  tags: Tag[];
  onUpdate: (todo: Task) => void;
};

const UpdateTodoForm: FC<Props> = ({ oldTask, onUpdate, tags, isLoading }) => {
  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Todo" onSubmit={onUpdate} />
        </ActionPanel>
      }
    >
      <Form.TextField id="text" title="Task Name" defaultValue={oldTask.text} />
      <Form.DatePicker id="date" title="Date" defaultValue={oldTask.date ? new Date(oldTask.date) : undefined} />
      <Form.TagPicker id="tags" title="Tags" defaultValue={oldTask.tags}>
        {tags.map((tag) => (
          <Form.TagPicker.Item key={tag.id} value={tag.id} title={tag.name} />
        ))}
      </Form.TagPicker>
      <Form.Dropdown id="difficulty" title="Level" defaultValue={oldTask.difficulty}>
        <Form.Dropdown.Item value="Trivial" title="Trivial" icon={DifficultyIconMap.Trivial} />
        <Form.Dropdown.Item value="Medium" title="Medium" icon={DifficultyIconMap.Medium} />
        <Form.Dropdown.Item value="Hard" title="Hard" icon={DifficultyIconMap.Hard} />
      </Form.Dropdown>
    </Form>
  );
};
