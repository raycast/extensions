import { AI, closeMainWindow, getPreferenceValues, LaunchProps, showToast, Toast } from "@raycast/api";
import { format, addDays, nextSunday, nextFriday } from "date-fns";

import { createReminder, getData } from "./api";

export default async function Command(props: LaunchProps & { arguments: Arguments.QuickAddReminder }) {
  try {
    const data = await getData();

    const lists = data.lists.map((list) => {
      return `${list.title}: ${list.id}`;
    });

    const preferences = getPreferenceValues<Preferences.QuickAddReminder>();

    if (preferences.shouldCloseMainWindow) {
      await closeMainWindow();
    } else {
      await showToast({ style: Toast.Style.Animated, title: "Adding to-do" });
    }

    const now = new Date();
    const today = format(now, "yyyy-MM-dd");
    const tomorrow = format(addDays(now, 1), "yyyy-MM-dd");
    const friday = format(nextFriday(now), "yyyy-MM-dd");
    const sunday = format(nextSunday(now), "yyyy-MM-dd");

    const result =
      await AI.ask(`Act as a task manager. I'll give you a task in a natural language. Your job is to return me only a parsable and minified JSON object.

Here are the possible keys of the JSON object with their respective values:
- title: The title of the task.
- priority: The task's priority. Possible values: "low", "medium", "high". If another word is used such as "urgent" or "important", the priority should be set to "high".
- listId: The id of the list that the task should be added to.
- dueDate: The due date of the task. Can either be a full day date (YYYY-MM-DD) or an ISO date if the time is specified (YYYY-MM-DDTHH:mm:ss.sssZ).
- recurrence: The recurrence pattern of the task. It includes:
  - frequency: Can be "daily", "weekly", "monthly", "yearly".
  - interval: The interval of the recurrence. This is an integer greater than 0 that specifies how often a pattern repeats. For example, if the recurrence rule is a weekly recurrence rule and its interval is 1, then the pattern repeats every week. If the recurrence rule is a monthly recurrence rule and its interval is 3, then the pattern repeats every three months.

Here are the list names with their respective ids:
${lists}

Please make sure to follow these rules:
- You should return a valid, parsable JSON object.
- Don't add a key if the user didn't specify it.
- IMPORTANT: Don't add a list id if the user didn't specify any list name.
- A date with a recurrence must have a due date. If no due date is specified, add one as you see fit.

Here are some examples to help you out:
- Book flights today: {"title":"Book flights","dueDate":"${today}"}
- Respond to mails: {"title":"Respond to mails"}
- Ship feature low priority: {"title":"Ship feature","priority":"low"}
- Collect dry cleaning this evening at 7PM: {"title":"Collect dry cleaning","dueDate":"${today}T19:00:00.000Z"}
- Pay taxes this week-end important: {"title":"Pay taxes","priority":"high","dueDate":"${friday}"}
- Read a book everyday: {"title":"Read a book","dueDate":"${today}","recurrence":{"frequency":"daily","interval":1}, }
- Clean the house every sunday: {"title":"Clean the house","dueDate":"${sunday}","recurrence":{"frequency":"weekly","interval":1}
- Review budget every 2 months starting from tomorrow: {"title":"Clean the house","dueDate":"${tomorrow}", "recurrence":{"frequency":"monthly","interval":2}}

Here's the task: "${props.fallbackText ?? props.arguments.text}"`);

    console.log(result);
    const json = JSON.parse(result.trim());
    if (props.arguments.notes) {
      json.notes = props.arguments.notes;
    }

    // The AI is assuming the user has a UTC timezone, so we need to adjust the date to actually match the user's timezone.
    if (json.dueDate && json.dueDate.includes("T")) {
      const date = new Date(json.dueDate);
      const timezoneOffset = date.getTimezoneOffset() * 60 * 1000;
      json.dueDate = new Date(date.getTime() + timezoneOffset).toISOString();
    }

    await createReminder(json);

    await showToast({
      style: Toast.Style.Success,
      title: "Added reminder",
    });
  } catch (error) {
    console.log(error);
    const message = error instanceof Error ? error.message : JSON.stringify(error);

    await showToast({
      style: Toast.Style.Failure,
      title: "Unable to add reminder",
      message,
    });
  }
}
