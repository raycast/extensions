import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { updateTask } from "../utils/taskOperations";
import { Task, Priority } from "../types";
import { ICONS } from "../constants";
import { getFormattedDescription } from "../utils";
interface EditTaskFormProps {
  task: Task;
  onTaskUpdated: (task: Task) => void;
}

export function EditTaskForm({ task, onTaskUpdated }: EditTaskFormProps) {
  const [text, setText] = useState(getFormattedDescription(task));
  const [dueDate, setDueDate] = useState<Date | undefined>(task.dueDate);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(task.scheduledDate);
  const [startDate, setStartDate] = useState<Date | undefined>(task.startDate);
  const [priority, setPriority] = useState<Priority | undefined>(task.priority);
  const [tags, setTags] = useState<string | undefined>(task.tags?.join(", "));
  const [recurrence, setRecurrence] = useState<string | undefined>(task.recurrence);
  const [isCompleted, setIsCompleted] = useState(task.completed);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { pop } = useNavigation();

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const updatedTask: Task = {
        ...task,
        description: text,
        dueDate,
        scheduledDate,
        startDate,
        priority: priority as Task["priority"],
        tags: tags
          ?.split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        recurrence,
        completed: isCompleted,
      };

      const result = await updateTask(updatedTask);

      await showToast({
        style: Toast.Style.Success,
        title: "Task updated",
      });

      onTaskUpdated(result);
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update task",
        message: String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDateChange = (
    setDateFunction: React.Dispatch<React.SetStateAction<Date | undefined>>
  ) => {
    return (newDate: Date | null) => {
      setDateFunction(newDate ?? undefined);
    };
  };

  const handleDueDateChange = handleDateChange(setDueDate);
  const handleScheduledDateChange = handleDateChange(setScheduledDate);
  const handleStartDateChange = handleDateChange(setStartDate);

  const handleClearDates = () => {
    setDueDate(undefined);
    setScheduledDate(undefined);
    setStartDate(undefined);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Task" onSubmit={handleSubmit} />
          <Action title="Clear Dates" onAction={handleClearDates} />
        </ActionPanel>
      }
      isLoading={isSubmitting}
    >
      <Form.TextField
        id="description"
        title="Description"
        placeholder="Enter task description"
        value={text}
        onChange={setText}
        autoFocus
      />

      <Form.Dropdown
        id="priority"
        title="Priority"
        value={priority}
        onChange={(newValue) => setPriority(newValue as Priority | undefined)}
      >
        <Form.Dropdown.Item value="" title="No Priority" />
        <Form.Dropdown.Item value={Priority.HIGHEST} title={`${ICONS.PRIORITY.HIGHEST}  Highest`} />
        <Form.Dropdown.Item value={Priority.HIGH} title={`${ICONS.PRIORITY.HIGH}  High`} />
        <Form.Dropdown.Item value={Priority.MEDIUM} title={`${ICONS.PRIORITY.MEDIUM}  Medium`} />
        <Form.Dropdown.Item value={Priority.LOW} title={`${ICONS.PRIORITY.LOW}  Low`} />
        <Form.Dropdown.Item value={Priority.LOWEST} title={`${ICONS.PRIORITY.LOWEST}  Lowest`} />
      </Form.Dropdown>

      <Form.DatePicker
        id="dueDate"
        title={`${ICONS.DATE.DUE}  Due Date`}
        value={dueDate}
        onChange={handleDueDateChange}
      />

      <Form.DatePicker
        id="scheduledDate"
        title={`${ICONS.DATE.SCHEDULED}  Scheduled Date`}
        value={scheduledDate}
        onChange={handleScheduledDateChange}
      />

      <Form.DatePicker
        id="startDate"
        title={`${ICONS.DATE.START}  Start Date`}
        value={startDate}
        onChange={handleStartDateChange}
      />

      <Form.TextField
        id="recurrence"
        title={`${ICONS.RECURRING}  Recurrence`}
        placeholder="e.g., every day, every week on Monday"
        value={recurrence}
        onChange={setRecurrence}
        info="Use natural language for recurring tasks, such as 'every day' or 'every week on Monday'"
      />

      <Form.TextField
        id="tags"
        title="Tags"
        placeholder="Enter comma-separated tags"
        value={tags}
        onChange={setTags}
        info="Enter tags separated by commas, e.g., work, personal, urgent"
      />

      <Form.Checkbox
        id="completed"
        title="Completed"
        label="Mark as completed"
        value={isCompleted}
        onChange={setIsCompleted}
      />
    </Form>
  );
}
