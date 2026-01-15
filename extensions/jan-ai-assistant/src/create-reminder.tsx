import {
  showToast,
  Toast,
  LaunchProps,
  getPreferenceValues,
} from "@raycast/api";
import { extractTaskFromJan } from "./utils/janApi";
import {
  createReminder,
  verifyReminderList,
  createReminderList,
  showRemindersInApp,
} from "./utils/reminderUtils";

interface Arguments {
  text: string;
}

export default async function Command(
  props: LaunchProps<{ arguments: Arguments }>,
) {
  const { text } = props.arguments;
  const preferences = getPreferenceValues<Preferences>();
  const listName = preferences.reminderList || "To Do";

  if (!text || text.trim() === "") {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: "Please provide text to create a reminder",
    });
    return;
  }

  await showToast({
    style: Toast.Style.Animated,
    title: "Processing with Jan.ai...",
  });

  try {
    // Step 1: Extract task data from Jan.ai (may return multiple tasks)
    const tasks = await extractTaskFromJan(text);

    await showToast({
      style: Toast.Style.Animated,
      title: `Creating ${tasks.length} reminder${tasks.length > 1 ? "s" : ""}...`,
    });

    // Step 2: Verify reminder list exists, create if needed
    const listExists = await verifyReminderList(listName);
    if (!listExists) {
      await createReminderList(listName);
    }

    // Step 3: Create all reminders and collect IDs
    const reminderIds: string[] = [];
    for (const task of tasks) {
      const reminderId = await createReminder(task, listName);
      reminderIds.push(reminderId);
    }

    // Step 4: Show reminders in Reminders app
    await showRemindersInApp(reminderIds, listName);

    // Step 5: Show success message
    if (tasks.length === 1) {
      const task = tasks[0];
      const successMessage = [
        `"${task.title}"`,
        task.dueDate ? `due ${task.dueDate}` : null,
        task.amount ? `($${task.amount.toFixed(2)})` : null,
      ]
        .filter(Boolean)
        .join(" ");

      await showToast({
        style: Toast.Style.Success,
        title: "Reminder created",
        message: successMessage,
      });
    } else {
      // Multiple tasks
      const summary = tasks
        .map((t) => {
          const parts = [t.title];
          if (t.amount) parts.push(`$${t.amount.toFixed(2)}`);
          if (t.dueDate) parts.push(t.dueDate);
          return parts.join(" - ");
        })
        .join("\n");

      await showToast({
        style: Toast.Style.Success,
        title: `${tasks.length} reminders created`,
        message:
          summary.length > 100 ? `${summary.substring(0, 100)}...` : summary,
      });
    }
  } catch (error) {
    console.error("Error creating reminder:", error);

    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to create reminder",
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}
