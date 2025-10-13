import { Form, ActionPanel, Action, showToast, Toast, popToRoot, Icon } from "@raycast/api";
import { showFailureToast, useForm } from "@raycast/utils";
import { addTask } from "./utils";

const MAX_TASK_LENGTH = 1000; // Reasonable limit for task descriptions

interface FormValues {
  task: string;
}

// Simple date formatting function
function formatDate(date: Date, format: string): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  if (format === "yyyy-MM-dd") {
    return `${year}-${month}-${day}`;
  }

  // For "EEEE, MMMM d, yyyy" format
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  return `${dayNames[date.getDay()]}, ${monthNames[date.getMonth()]} ${date.getDate()}, ${year}`;
}

export default function Command() {
  const { handleSubmit, itemProps, reset } = useForm<FormValues>({
    async onSubmit(values) {
      const trimmedTask = values.task?.trim();

      try {
        const today = formatDate(new Date(), "yyyy-MM-dd");
        await addTask(today, trimmedTask);
        await showToast({
          style: Toast.Style.Success,
          title: "Task Logged!",
          message: trimmedTask,
        });
        reset(); // Clear the form after successful submission
        popToRoot({ clearSearchBar: true });
      } catch (error) {
        await showFailureToast(error, { title: "Failed to log task" });
      }
    },
    validation: {
      task: (value: string | undefined) => {
        if (!value || value.trim().length === 0) {
          return "Task is required";
        }
        if (value.trim().length > MAX_TASK_LENGTH) {
          return `Please keep tasks under ${MAX_TASK_LENGTH} characters`;
        }
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Log Task" icon={Icon.Checkmark} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="What task did you just complete? 🎉" />
      <Form.TextArea
        title="Task"
        placeholder="e.g., Deployed the new feature to production"
        info={`${(itemProps.task.value || "").length}/${MAX_TASK_LENGTH} characters`}
        {...itemProps.task}
      />
      <Form.Description text={`Logging for: ${formatDate(new Date(), "EEEE, MMMM d, yyyy")}`} />
    </Form>
  );
}
