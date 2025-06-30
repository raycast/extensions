import {
  AI,
  closeMainWindow,
  environment,
  getPreferenceValues,
  LaunchProps,
  LocalStorage,
  showToast,
  Toast,
} from "@raycast/api";
import * as chrono from "chrono-node";
import { format, addDays, nextSunday, nextFriday, nextSaturday, addYears, subHours } from "date-fns";
import { createReminder, getData } from "swift:../swift/AppleReminders";

import { NewReminder } from "./create-reminder";
import { Data } from "./hooks/useData";

export default async function Command(props: LaunchProps<{ arguments: Arguments.QuickAddReminder }>) {
  try {
    const preferences = getPreferenceValues<Preferences.QuickAddReminder>();

    if (preferences.shouldCloseMainWindow) {
      await closeMainWindow();
    } else {
      await showToast({ style: Toast.Style.Animated, title: "Adding to-do" });
    }

    if (!environment.canAccess(AI) || preferences.dontUseAI) {
      const text = props.arguments.text;

      let reminderList;
      let dueDate;
      let isDateTime;

      const dateMatch = chrono.parse(text);
      if (dateMatch && dateMatch.length > 0) {
        const chronoDate = dateMatch[0].start;
        isDateTime = chronoDate.isCertain("hour") || chronoDate.isCertain("minute") || chronoDate.isCertain("second");
        const date = chronoDate.date();
        dueDate = isDateTime ? date.toISOString() : format(date, "yyyy-MM-dd");
      }

      const listMatch = text.match(/#(\w+)/);

      if (listMatch) {
        const data: Data = await getData();
        reminderList = data.lists.find((list) => list.title.toLowerCase() === listMatch[1].toLowerCase());
      }

      // Clean all values matching from text and previous white space as title constant
      const title = text
        .replace(listMatch ? listMatch[0] : "", "")
        .replace(dateMatch && dateMatch.length > 0 ? dateMatch[0].text : "", "")
        .replace(/\s+/g, " ")
        .trim();

      const reminder: NewReminder = { title, listId: reminderList?.id, dueDate };

      if (props.arguments.notes) {
        reminder.notes = props.arguments.notes;
      }

      await createReminder(reminder);

      const formattedDueDate = dueDate ? ` due ${format(dueDate, `${isDateTime ? "PPPpp" : "PPP"}`)}` : "";
      const toastMessage = `Added "${title}" to ${reminderList?.title ?? "default list"}${formattedDueDate}`;

      await showToast({
        style: Toast.Style.Success,
        title: toastMessage,
      });
      return;
    }

    await showToast({
      style: Toast.Style.Animated,
      title: "Adding reminder",
    });

    const data: Data = await getData();

    const lists = data.lists.map((list) => {
      return `${list.title}:${list.id}`;
    });

    const now = new Date();
    const today = format(now, "yyyy-MM-dd");
    const currentTime = format(now, "HH:mm");
    const tomorrow = format(addDays(now, 1), "yyyy-MM-dd");
    const friday = format(nextFriday(now), "yyyy-MM-dd");
    const saturday = format(nextSaturday(now), "yyyy-MM-dd");
    const sunday = format(nextSunday(now), "yyyy-MM-dd");

    // Pick a relatively recent date; when referred to by Month/Day we should return next year
    const recentDate = addDays(now, -3);
    const recentDateMonth = format(recentDate, "MMM");
    const recentDateDay = format(recentDate, "d");
    const nextRecentDate = format(addYears(recentDate, 1), "yyyy-MM-dd");

    // Pick an upcoming day. When referring to "next <day>" we should pick a week from then
    const upcoming = addDays(now, 2);
    const upcomingDate = format(upcoming, "yyyy-MM-dd");
    const upcomingDateWeekday = format(upcoming, "EEEE");
    const upcomingDateWeekdayNext = format(addDays(now, 9), "yyyy-MM-dd");

    // Pick a recent time. When referring to that time we should pick tomorrow
    const oneHourAgo = format(subHours(now, 1), "haa"); // won't work well 12:00am-12:59am
    const oneHourAgoTomorrow = format(addDays(subHours(now, 1), 1), "yyyy-MM-dd'T'HH:00:ss");
    const oneHourFromNow = format(subHours(now, -1), "haa"); // won't work well 11:00pm-11:59pm
    const oneHourFromNowToday = format(addDays(subHours(now, -1), 1), "yyyy-MM-dd'T'HH:00:ss");

    const locations = await LocalStorage.getItem("saved-locations");

    const prompt = `Act as a NLP parser for tasks. I'll give you a task text and you'll return me only a parsable and minified JSON object.\n

Here's the JSON Object structure:
{
  "title": <Task title>,
  "description": <Task description. A human-readable description of the task. Use relative dates when appropriate. Include the task name in single quotes. Always include the list (or "default list" if none is specified). Always include the priority level if specified. Always include the recurrence if specified.>,
  "priority": <Task priority. Only pick the value from this list: "low", "medium", "high". Use the "high" priority if the task text specifies a word such as "urgent", "important", or an exclamation mark.>,
  "listId": <Task list ID. Pick it from the following table by finding the list name corresponding to an ID: ${lists}. Don't add a listId if the user hasn't specified a list name. Note that the user can prepend the "#" or "@" symbols to list names, for example, "#work" or "@work".>,
  "dueDate": <Task due date. Can either be a full day date (YYYY-MM-DD) or an ISO date if the time is specified (YYYY-MM-DDTHH:mm:ss.sssZ). Use sensible defaults for common timeframes (e.g "8am" for "morning", "1pm" for "afternoon", "6pm" for "evening"). A number with "a" or "p" appended (e.g. "1p" or "8a") should be treated as AM or PM. Never use dates before ${today} unless the specific month/day/year is provided. If the user includes a time before ${currentTime} and no date, assume they mean tomorrow>,
  "recurrence": {
    "frequency": <Recurrence frequency. Only pick the value from this list: "daily", "weekly", "monthly", "yearly".>,
    "interval": <Recurrence interval. An integer greater than 0 that specifies how often a pattern repeats. If a recurrence frequency is "weekly" rule and the interval is 1, then the pattern repeats every week. If a recurrence frequency is "monthly" rule and the interval is 3, then the pattern repeats every 3 months.>,
    "endDate": <Recurrence end date. A full day date (YYYY-MM-DD). If no end date is specified, the recurrence will repeat forever.>
  },
  "address": <Task address. If the task text specifies an address, include it here.>,
  "proximity": <Task proximity. Only pick the value from this list: "enter", "leave".>
  "radius": <Task radius. A number that specifies the radius around the location in meters.>
}

Here are the rules you must follow:
- You MUST return a valid, parsable JSON object.
- Any text in quotes should be taken in its entirely as the task's title, and not interpreted for dates, priority, lists, etc.
- The title is made up of all the words you can't parse, in order. NEVER drop words.
- Always capitalize weekday, month, and list names in your output.
- Don't include a time unless specifically indicated by the user.
- Today is ${today} and the current time is ${currentTime}.
- Pay special attention to "this" vs "next" day of the week.
- The weekend begins on Saturday and the week begins on Monday. (e.g. tasks for "next week" would be scheduled for the upcoming Monday.)
- Any recurring task MUST include a dueDate. If no due date is specified, use one that makes the most sense.
- If the user seems to specify an address, search for a matching location in the following data set: ${locations}.

Here are some examples to help you out:
- Respond to email: {"title":"Respond to email"}
- Book flights today: {"title":"Book flights","description":"'Book flights' today to default list","dueDate":"${today}"}
- Collect dry cleaning this evening: {"title":"Collect dry cleaning","description":"'Collect dry cleaning' today at 6pm to default list","dueDate":"${today}T18:00:00.000Z"}
- Ship feature low priority: {"title":"Ship feature","description":"'Ship feature' (low priority) to default list","priority":"low"}
- Pay taxes this weekend important: {"title":"Pay taxes","description":"'Pay taxes' (high priority) on Saturday to default list","priority":"high","dueDate":"${saturday}"}
- Check for newspaper today!: {"title":"Check for newspaper","description":"'Check for newspaper' (high priority) today to default list","dueDate":"${today}","priority":"high"} 
- Take a walk ${oneHourFromNow}: {"title":"Take a walk","description":"'Take a walk' today at ${oneHourFromNow} to default list","dueDate":"${oneHourFromNowToday}"}
- Take a walk ${oneHourAgo}: {"title":"Take a walk","description":"'Take a walk' tomorrow at ${oneHourAgo} to default list","dueDate":"${oneHourAgoTomorrow}"}
- Eat ${oneHourFromNow} nachos: {"title":"Eat nachos","description":"'Eat nachos' today at ${oneHourFromNow} to default list","dueDate":"${oneHourFromNowToday}"}
- Get groceries ${upcomingDateWeekday}: {"title":"Get groceries","description":"'Get groceries' on ${upcomingDate} to default list","dueDate":"${upcomingDate}"}
- Get groceries next ${upcomingDateWeekday}: {"title":"Get groceries","description":"'Get groceries' on ${upcomingDateWeekdayNext} to default list","dueDate":"${upcomingDateWeekdayNext}"}
- Read a book every day: {"title":"Read a book","description":"'Read a book' daily to default list","dueDate":"${today}","recurrence":{"frequency":"daily","interval":1}, }
- Read every book fri: {"title":"Read every book","description":"'Read every book' on Friday to default list","dueDate":"${friday}"}
- Read books every fri: {"title":"Read books","description":"'Read books' weekly on Fridays to default list","dueDate":"${friday}","recurrence":{"frequency":"weekly","interval":1}}
- Clean the house every sunday: {"title":"Clean the house","description":"'Clean the house' weekly on Sundays to default list","dueDate":"${sunday}","recurrence":{"frequency":"weekly","interval":1}
- Call mom monthly on sunday: {"title":"Call mom","description":"'Call mom' monthly starting ${sunday} to default list","dueDate":"${sunday}","recurrence":{"frequency":"monthly","interval":1}}
- Dad's birthday on ${recentDateMonth} ${recentDateDay}: {"title":"Dad's birthday","description":"'Dad's birthday' on ${nextRecentDate} to default list","dueDate":"${nextRecentDate}"}
- Monthly breakfast with friends Saturday: {"title":"Monthly breakfast with friends","description":"'Monthly breakfast with friends' recurring monthly starting ${saturday} to default list","dueDate":"${saturday}","recurrence":{"frequency":"monthly","interval":1}}
- Review budget every 2 months starting from tomorrow: {"title":"Review budget","description":"'Review budget' every 2 months starting ${tomorrow} to default list","dueDate":"${tomorrow}", "recurrence":{"frequency":"monthly","interval":2}}
- Water the flowers every day from tomorrow until ${upcomingDateWeekday}: {"title":"Water the flowers","description":"'Water the flowers' every day from ${tomorrow} until ${upcomingDate} to default list","dueDate":"${tomorrow}","recurrence":{"frequency":"daily","interval":1,"endDate":"${upcomingDate}"}}
- Cook meals until ${upcomingDateWeekday}: {"title":"Cook meals","description":"'Cook meals' every day until ${upcomingDate} to default list","dueDate":"${today}","recurrence":{"frequency":"daily","interval":1,"endDate":"${upcomingDate}"}}

Task text: "${props.fallbackText ?? props.arguments.text}"`;

    const { description, ...newReminder } = await askAI(prompt);
    if (props.arguments.notes) {
      newReminder.notes = props.arguments.notes;
    }

    if (newReminder.dueDate && newReminder.dueDate.includes("T")) {
      const date = new Date(newReminder.dueDate);
      const timezoneOffset = date.getTimezoneOffset() * 60 * 1000;
      newReminder.dueDate = new Date(date.getTime() + timezoneOffset).toISOString();
    }

    await createReminder(newReminder);

    await showToast({
      style: Toast.Style.Success,
      title: "Added reminder: " + description,
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

async function askAI(prompt: string): Promise<NewReminder & { description: string }> {
  const maxRetries = 3;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await AI.ask(prompt, { model: AI.Model.OpenAI_GPT4o });
      const jsonMatch = result.match(/[{\\[]{1}([,:{}\\[\]0-9.\-+Eaeflnr-u \n\r\t]|".*?")+[}\]]{1}/gis)?.[0];
      if (!jsonMatch) {
        throw new Error("Invalid result returned from AI");
      }
      const json = JSON.parse(jsonMatch.trim());
      if (json.recurrence && !json.dueDate) {
        throw new Error("Recurrence without dueDate");
      }
      return json;
    } catch (error) {
      console.log(`Retriying AI call. Retry count: ${i}`);
    }
  }

  throw new Error("Max retries reached. Unable to get a valid response from AI.");
}
