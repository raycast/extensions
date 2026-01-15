import { exec } from "child_process";
import { promisify } from "util";
import { ParsedTask } from "./types";

const execAsync = promisify(exec);

/**
 * Escape strings for AppleScript
 */
function escapeAppleScript(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Create a reminder in Apple Reminders using AppleScript
 * Returns the reminder ID for later selection
 */
export async function createReminder(
  task: ParsedTask,
  listName: string,
): Promise<string> {
  const escapedTitle = escapeAppleScript(task.title);

  // Build notes with amount if present
  let notes = task.notes || "";
  if (task.amount) {
    const amountText = `Amount: $${task.amount.toFixed(2)}`;
    notes = notes ? `${amountText}\n\n${notes}` : amountText;
  }
  if (task.isInvoice) {
    notes = notes ? `[INVOICE]\n${notes}` : "[INVOICE]";
  }
  if (task.isBill) {
    notes = notes ? `[BILL]\n${notes}` : "[BILL]";
  }

  const escapedNotes = escapeAppleScript(notes);
  const escapedListName = escapeAppleScript(listName);

  // Build AppleScript properties
  const properties: string[] = [`name:"${escapedTitle}"`];

  if (notes) {
    properties.push(`body:"${escapedNotes}"`);
  }

  if (task.dueDate) {
    // Convert YYYY-MM-DD to AppleScript-compatible date format
    const [year, month, day] = task.dueDate.split("-");
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
    const monthName = monthNames[parseInt(month, 10) - 1];

    // If time is specified, include it in the date string
    if (task.dueTime) {
      const [hours, minutes] = task.dueTime.split(":");
      const hour = parseInt(hours, 10);
      const period = hour >= 12 ? "PM" : "AM";
      const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;

      const appleScriptDate = `${monthName} ${parseInt(day, 10)}, ${year} ${hour12}:${minutes.padStart(2, "0")} ${period}`;
      properties.push(`due date:date "${appleScriptDate}"`);
    } else {
      // Date only, no time
      const appleScriptDate = `${monthName} ${parseInt(day, 10)}, ${year}`;
      properties.push(`due date:date "${appleScriptDate}"`);
    }
  }

  // Build recurrence rule if repeat interval is specified
  let recurrenceScript = "";
  if (task.repeatInterval) {
    const interval = task.repeatInterval.toUpperCase();
    recurrenceScript = `
      set recurrenceRule to "FREQ=${interval}"
      set body of newReminder to body of newReminder & "\\nRecurs: ${task.repeatInterval}"
    `;
  }

  const propertiesStr = properties.join(", ");

  const script = `
    tell application "Reminders"
      tell list "${escapedListName}"
        set newReminder to make new reminder with properties {${propertiesStr}}
        ${recurrenceScript}
        return id of newReminder
      end tell
    end tell
  `;

  try {
    const { stdout } = await execAsync(
      `osascript -e '${script.replace(/'/g, "'\\''")}'`,
    );
    return stdout.trim();
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("execution error")) {
        throw new Error(
          `Failed to create reminder. Make sure the "${listName}" list exists in Apple Reminders.`,
        );
      }
      throw new Error(`AppleScript error: ${error.message}`);
    }
    throw new Error("Unknown error creating reminder");
  }
}

/**
 * Show created reminders in the Reminders app
 */
export async function showRemindersInApp(
  reminderIds: string[],
  listName: string,
): Promise<void> {
  if (reminderIds.length === 0) return;

  const escapedListName = escapeAppleScript(listName);

  // Build script to activate app and show the list
  const script = `
    tell application "Reminders"
      activate
      show list "${escapedListName}"
    end tell
  `;

  try {
    await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
  } catch (error) {
    console.error("[showRemindersInApp] Error:", error);
    // Don't throw - showing reminders is not critical
  }
}

/**
 * Verify that the specified list exists in Apple Reminders
 */
export async function verifyReminderList(listName: string): Promise<boolean> {
  const script = `
    tell application "Reminders"
      return name of every list
    end tell
  `;

  try {
    const { stdout } = await execAsync(
      `osascript -e '${script.replace(/'/g, "'\\''")}'`,
    );
    const lists = stdout.trim().split(", ");
    return lists.includes(listName);
  } catch (error) {
    return false;
  }
}

/**
 * Create the reminder list if it doesn't exist
 */
export async function createReminderList(listName: string): Promise<void> {
  const escapedListName = escapeAppleScript(listName);

  const script = `
    tell application "Reminders"
      make new list with properties {name:"${escapedListName}"}
    end tell
  `;

  try {
    await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
  } catch (error) {
    throw new Error(
      `Failed to create reminder list: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
