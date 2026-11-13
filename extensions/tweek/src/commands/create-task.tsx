import { showToast, Toast } from "@raycast/api";
import React from "react";
import { TaskForm } from "../components/TaskForm";
import { useCalendars } from "../hooks/useCalendars";
import { invalidateTaskCache } from "../hooks/useTaskCache";
import { CreateTaskInput } from "../types";
import { bulk_create_tasks, create_task } from "../utils/tweek-client";

export default function CreateTaskCommand() {
  const { calendars, customColors, activeCalendarId } = useCalendars();

  const handleCreate = async (input: CreateTaskInput) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating task in Tweek...",
    });

    try {
      await create_task(input);
      invalidateTaskCache(input.calendarId);
      toast.style = Toast.Style.Success;
      toast.title = "Task Created";
      toast.message = input.text;
      return true;
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to Create Task";
      toast.message = err instanceof Error ? err.message : "Unknown error";
      return false;
    }
  };

  const handleBulkCreate = async (inputs: CreateTaskInput[]) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Creating ${inputs.length} tasks...`,
    });

    try {
      const result = await bulk_create_tasks(inputs);
      if (inputs[0]?.calendarId) {
        invalidateTaskCache(inputs[0].calendarId);
      }

      toast.style =
        result.failed.length > 0 ? Toast.Style.Failure : Toast.Style.Success;
      toast.title = `Created ${result.succeeded.length}/${inputs.length} tasks`;
      return result.failed.length === 0;
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to Create Tasks";
      toast.message = err instanceof Error ? err.message : "Unknown error";
      return false;
    }
  };

  return (
    <TaskForm
      mode="create"
      isPushed={false}
      calendars={calendars}
      defaultCalendarId={activeCalendarId}
      customColors={customColors}
      onSubmitCreate={handleCreate}
      onSubmitBulkCreate={handleBulkCreate}
    />
  );
}
