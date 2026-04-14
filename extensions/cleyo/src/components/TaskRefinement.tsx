/**
 * Post-creation task refinement view
 * Allows users to set priority, due date, and category after quick task creation
 */

import { useState } from "react";
import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  popToRoot,
  Icon,
} from "@raycast/api";
import { Task, TaskCategory, EnergyLevel } from "../lib/types";
import { updateTask } from "../lib/api";
import {
  PRIORITY_OPTIONS,
  CATEGORY_OPTIONS,
  ENERGY_OPTIONS,
} from "../lib/constants";

interface TaskRefinementProps {
  task: Task;
}

export default function TaskRefinement({ task }: TaskRefinementProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [description, setDescription] = useState(task.description || "");
  const [priority, setPriority] = useState(task.priority?.toString() || "");
  const [category, setCategory] = useState(task.category || "");
  const [dueDate, setDueDate] = useState<Date | null>(
    task.due_date ? new Date(task.due_date) : null,
  );
  const [energy, setEnergy] = useState(task.energy_required || "");

  async function handleDone() {
    setIsLoading(true);

    try {
      // Check if any changes were made
      const updates: Partial<Task> = {};

      // Check description changes
      const newDescription = description.trim() || null;
      const existingDescription = task.description?.trim() || null;
      if (newDescription !== existingDescription) {
        updates.description = newDescription;
      }

      const newPriority = priority ? parseInt(priority) : null;
      if (newPriority !== task.priority) {
        updates.priority = newPriority;
      }

      if (category !== (task.category || "")) {
        updates.category = (category || null) as TaskCategory | null;
      }

      const newDueDate = dueDate ? dueDate.toISOString().split("T")[0] : null;
      const existingDueDate = task.due_date
        ? new Date(task.due_date).toISOString().split("T")[0]
        : null;
      if (newDueDate !== existingDueDate) {
        updates.due_date = newDueDate;
      }

      if (energy !== (task.energy_required || "")) {
        updates.energy_required = (energy || null) as EnergyLevel | null;
      }

      // Only update if there are changes
      if (Object.keys(updates).length > 0) {
        await updateTask(task.id, updates);
        await showToast({
          style: Toast.Style.Success,
          title: "Task updated",
          message: task.title,
        });
      } else {
        await showToast({
          style: Toast.Style.Success,
          title: "Task saved",
          message: task.title,
        });
      }

      await popToRoot();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to update task",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Refine Task"
      actions={
        <ActionPanel>
          <Action title="Save" icon={Icon.Check} onAction={handleDone} />
          <Action
            title="Skip Refinement"
            icon={Icon.ArrowRight}
            onAction={popToRoot}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="✓ Task Created"
        text={`"${task.title}"\n\nRefine the details below or press Enter to save.`}
      />

      <Form.Separator />

      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Add more details about this task..."
        value={description}
        onChange={setDescription}
        enableMarkdown
      />

      <Form.DatePicker
        id="dueDate"
        title="Due Date"
        value={dueDate}
        onChange={setDueDate}
        type={Form.DatePicker.Type.Date}
      />

      <Form.Dropdown
        id="priority"
        title="Priority"
        value={priority}
        onChange={setPriority}
      >
        <Form.Dropdown.Item value="" title="None" />
        {PRIORITY_OPTIONS.filter((o) => o.value !== "1").map((option) => (
          <Form.Dropdown.Item
            key={option.value}
            value={option.value}
            title={option.title}
            icon={option.icon || undefined}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="category"
        title="Category"
        value={category}
        onChange={setCategory}
      >
        <Form.Dropdown.Item value="" title="None" />
        {CATEGORY_OPTIONS.map((option) => (
          <Form.Dropdown.Item
            key={option.value}
            value={option.value}
            title={option.title}
            icon={option.icon}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="energy"
        title="Energy Required"
        value={energy}
        onChange={setEnergy}
      >
        <Form.Dropdown.Item value="" title="None" />
        {ENERGY_OPTIONS.map((option) => (
          <Form.Dropdown.Item
            key={option.value}
            value={option.value}
            title={option.title}
            icon={option.icon}
          />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      <Form.Description text="Press ⌘↵ to skip refinement and save as-is." />
    </Form>
  );
}
