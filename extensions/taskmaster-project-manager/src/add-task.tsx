/**
 * TaskMaster Add Task Command - Form-based task creation
 */

import {
  ActionPanel,
  Action,
  Form,
  Icon,
  getPreferenceValues,
  popToRoot,
} from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { useState } from "react";
import { TaskMasterSettings, TaskStatus, TaskPriority } from "./types/task";
import { useTasks } from "./hooks/useTaskMaster";
import { addTask } from "./lib/write-utils";

interface TaskFormValues {
  title: string;
  description: string;
  details: string;
  priority: string;
  status: string;
  testStrategy: string;
  dependencies: string;
}

export default function AddTaskCommand() {
  const settings = getPreferenceValues<TaskMasterSettings>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { revalidate } = useTasks({ projectRoot: settings.projectRoot });

  const { handleSubmit, itemProps, reset } = useForm<TaskFormValues>({
    async onSubmit(values) {
      setIsSubmitting(true);

      try {
        // Create task object matching TaskMaster structure
        const taskData = {
          title: values.title.trim(),
          description: values.description.trim(),
          details: values.details.trim() || undefined,
          priority: values.priority as TaskPriority,
          status: values.status as TaskStatus,
          testStrategy: values.testStrategy.trim() || undefined,
          dependencies: values.dependencies
            ? values.dependencies
                .split(",")
                .map((dep) => dep.trim())
                .filter((dep) => dep.length > 0)
            : [],
        };

        // addTask now handles its own success/error toasts and validation
        await addTask(settings.projectRoot, taskData);

        // Refresh task data and return to root only on success
        revalidate();
        await popToRoot();
      } catch (error) {
        // Error toast is already shown by addTask function
        console.error("Task creation failed:", error);
      } finally {
        setIsSubmitting(false);
      }
    },
    validation: {
      title: (value) => {
        if (!value || !value.trim()) {
          return "Task title is required";
        }
        if (value.trim().length < 3) {
          return "Task title must be at least 3 characters long";
        }
        if (value.trim().length > 100) {
          return "Task title must be less than 100 characters";
        }
        return undefined;
      },
      description: (value) => {
        if (!value || !value.trim()) {
          return "Task description is required";
        }
        if (value.trim().length < 10) {
          return "Task description must be at least 10 characters long";
        }
        if (value.trim().length > 1000) {
          return "Task description must be less than 1000 characters";
        }
        return undefined;
      },
      priority: FormValidation.Required,
      status: FormValidation.Required,
      details: (value) => {
        if (value && value.length > 2000) {
          return "Implementation details must be less than 2000 characters";
        }
        return undefined;
      },
      testStrategy: (value) => {
        if (value && value.length > 1000) {
          return "Test strategy must be less than 1000 characters";
        }
        return undefined;
      },
      dependencies: (value) => {
        if (!value || !value.trim()) return undefined;

        const deps = value.split(",").map((dep) => dep.trim());
        const invalidDeps = deps.filter((dep) => {
          if (!dep) return false; // Empty deps are filtered out
          return !/^\d+(\.\d+)*$/.test(dep); // Allow both "1" and "1.1" format
        });

        if (invalidDeps.length > 0) {
          return "Dependencies must be task IDs (e.g., 1, 2.1, 5) separated by commas";
        }
        return undefined;
      },
    },
    initialValues: {
      title: "",
      description: "",
      details: "",
      priority: "medium",
      status: "pending",
      testStrategy: "",
      dependencies: "",
    },
  });

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Task"
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
          <Action
            title="Reset Form"
            icon={Icon.ArrowCounterClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={reset}
          />
          <Action
            title="Cancel"
            icon={Icon.XMarkCircle}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            onAction={popToRoot}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Title"
        placeholder="Enter task title..."
        info="A clear, concise title for the task"
        {...itemProps.title}
      />

      <Form.TextArea
        title="Description"
        placeholder="Describe what needs to be done..."
        info="Brief description of the task requirements and goals"
        {...itemProps.description}
      />

      <Form.Separator />

      <Form.Dropdown
        title="Priority"
        info="Task priority level affecting scheduling and resource allocation"
        {...itemProps.priority}
      >
        <Form.Dropdown.Item
          value="high"
          title="High Priority"
          icon={Icon.ExclamationMark}
        />
        <Form.Dropdown.Item
          value="medium"
          title="Medium Priority"
          icon={Icon.Minus}
        />
        <Form.Dropdown.Item
          value="low"
          title="Low Priority"
          icon={Icon.ChevronDown}
        />
      </Form.Dropdown>

      <Form.Dropdown
        title="Initial Status"
        info="Starting status for the new task"
        {...itemProps.status}
      >
        <Form.Dropdown.Item
          value="pending"
          title="Pending"
          icon={Icon.Circle}
        />
        <Form.Dropdown.Item
          value="in-progress"
          title="In Progress"
          icon={Icon.Clock}
        />
        <Form.Dropdown.Item value="review" title="Review" icon={Icon.Eye} />
        <Form.Dropdown.Item
          value="deferred"
          title="Deferred"
          icon={Icon.Pause}
        />
      </Form.Dropdown>

      <Form.Separator />

      <Form.TextArea
        title="Implementation Details"
        placeholder="Detailed implementation notes, technical requirements, approach..."
        info="Comprehensive details about how the task should be implemented"
        {...itemProps.details}
      />

      <Form.TextArea
        title="Test Strategy"
        placeholder="How this task will be tested and validated..."
        info="Testing approach, validation criteria, and acceptance conditions"
        {...itemProps.testStrategy}
      />

      <Form.TextField
        title="Dependencies"
        placeholder="1, 2, 5 (task IDs separated by commas)"
        info="Task IDs that must be completed before this task can start"
        {...itemProps.dependencies}
      />
    </Form>
  );
}
