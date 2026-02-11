import { runAppleScript } from "@raycast/utils";

const REMINDER_TITLE = "Log Jira Worklog";
const DEEP_LINK = "raycast://extensions/sarjilnapit/jira-automation/manage-tickets";

export async function syncReminders(time: string, days: string[], enabled: boolean) {
  const daysString = days.length > 0 ? `{"${days.join('", "')}"}` : "{}";

  // Use a more robust AppleScript that handles weekdays correctly and avoids infinite loops
  const script = `
    tell application "Reminders"
      -- Efficiently find and delete existing Jira reminders
      delete (every reminder whose name is "${REMINDER_TITLE}")

      if "${enabled}" is "false" or "${time}" is "" or ${days.length} is 0 then
        return "Cleaned up"
      end if

      set targetDays to ${daysString}
      set reminderTime to "${time}:00"
      
      repeat with d in targetDays
        set theDate to current date
        set time string of theDate to reminderTime
        
        -- weekday of date is a constant (Monday, Tuesday, etc.)
        -- We loop at most 7 times to find the correct weekday
        repeat 7 times
          if (weekday of theDate as string) is d then exit repeat
          set theDate to theDate + (1 * days)
        end repeat
        
        -- If the time has already passed today, move to next week
        if theDate < (current date) then
          set theDate to theDate + (7 * days)
        end if

        make new reminder with properties {name:"${REMINDER_TITLE}", body:"${DEEP_LINK}", due date:theDate, remind me date:theDate}
      end repeat
      return "Success"
    end tell
  `;

  try {
    const result = await runAppleScript(script);
    console.log("Reminders sync result:", result);
  } catch (error) {
    console.error("Failed to sync macOS reminders:", error);
    // If it's a timeout, it likely waiting for permission from the user
    if (String(error).includes("Timed out")) {
      throw new Error(
        "macOS Reminders request timed out. Please ensure you have granted Raycast permission to access Reminders and try again."
      );
    }
    throw error;
  }
}
