import { runAppleScript } from "run-applescript";
import { Subset, TodoCore, TodoStatus } from "../../types";
import { quoteAndEscape, toAppleScriptDate } from "../applescript";
import { initStore } from "../eventkit";
import { REMINDERS_URL_PREFIX } from "./reminders-sql";
import { OptionalAction, TodoFormData, UpdateTodoData } from "./types";

type SetPropertyLine = `r's set${string}:${string}` | `set includeTimeComponents to (r's dueDateComponents() ${string}`;

type AppleScripter<T> = {
  [K in keyof T]: (value: T[K]) => SetPropertyLine | null;
};

export const enabledAction: Record<OptionalAction, boolean> = {
  setStartDate: true,
  setPriority: true,
  markAsCanceled: false,
};

const appleScripter: AppleScripter<UpdateTodoData> = {
  title: (title) => `r's setTitle:${quoteAndEscape(title)}`,

  // Reminders doesn't have "canceled", which should've been blocked in the UI.
  status: (status) => `r's setCompleted:${status === TodoStatus.open ? 0 : 1}`,

  // Sets the reminder's `startDateComponents` to the given date. The date is assumed to be from a date-only picker, and
  // its time components are ignored. The `startDateComponents` will have time components if the `dueDateComponents` has
  // time components to keep the `isAllDay` value intact. Otherwise, `isAllDay` becomes to 1 and `dueDateComponents`
  // loses its time components.
  //
  // Interestingly, if `dueDateComponents` is missing, setting `startDateComponents` without time components does not
  // change the `isAllDay` value to 1. It remains 0.
  startDate: (startDate) =>
    `r's setStartDateComponents:${
      startDate
        ? `getDateComponents(${toAppleScriptDate(
            startDate
          )}, getUnitFlags(r's dueDateComponents() is not missing value and not r's isAllDay))`
        : "missing value"
    }`,

  // Sets the reminder's `dueDateComponents` to the given date. The date is assumed to be from a date-only picker, and
  // its time components are ignored. The current `dueDateComponents`'s time components, if any, are preserved.
  //
  // The impact of setting `dueDateComponents` on `startDateComponents`:
  // - In the Reminders app (macOS/iOS), nothing.
  // - Using AppleScript,
  //   - if `startDateComponents` was `missing value`, it is set to the same value as `dueDateComponents`.
  //   - otherwise, nothing.
  //
  // When `dueDateComponents` is removed, `startDateComponents`'s time components are removed so they can be interpreted
  // correctly. But if `dueDateComponents` is updated in the Reminders app, `startDateComponents` is not changed and
  // may be interpreted incorrectly depending on the offset between UTC and the system time zone.
  //
  // `isAllDay` is not 100% clear cut and should be interpreted with caution. `isAllDay` value is:
  // - 0 for a new Reminder,
  // - set by whether `dueDateComponents` has time components,
  // - if `startDateComponents` is set while `dueDateComponents` is present, can be altered by wheter
  //   `startDateComponents` has time components,
  // - if `dueDateComponents` is removed while the attached time-based alarm and `startDateComponents` are present, is
  //   not altered by whether `startDateComponents` has time components,
  // - if both `dueDateComponents` and the attached time-based alarm are removed, it is altered.
  // - 1 when both `dueDateComponents` and `startDateComponents` lack time components (even with a time-based alarm),
  // - 0 or 1 when both `startDateComponents` and `dueDateComponents` have been removed, depending on the last value.
  //
  // Alarms should be added, updated, and deleted when `dueDateComponents` is changed.
  // - Setting `dueDate` with "On a Day" (macOS) or "Date" (iOS) doesn't attach any alarms to the reminder.
  // - Setting `dueDate` with "At a Time" (macOS) or "Time" (iOS) attaches an alarm to the reminder.
  // - Setting `dueDate` using AppleScript does not attach an alarm to the reminder.
  // - If a reminder has a location-based alarm, the alarm's `absoluteDate` is `missing value`.
  // - If a reminder has a time-based alarm, changing `dueDate` without adjusting the alarm does not change the date and
  //   time displayed in the Reminders app (`ZDISPLAYDATEDATE`), even if the new date date is `missing value`.
  dueDate: (dueDate) => {
    const alarmScript = `
if r's hasAlarms then
  set predicate to (current application's NSPredicate's predicateWithFormat:"absoluteDate != nil")
  set timeBasedAlarm to (r's alarms's filteredArrayUsingPredicate:predicate)'s firstObject()
  if timeBasedAlarm is not missing value then ${
    dueDate ? "timeBasedAlarm's setAbsoluteDate:theDueDate" : "r's removeAlarm:timeBasedAlarm"
  }
end if`;

    if (dueDate) {
      return `set includeTimeComponents to (r's dueDateComponents() is not missing value and not r's isAllDay)
set unitFlags to getUnitFlags(includeTimeComponents)

set theDueDate to ${toAppleScriptDate(dueDate)}
if includeTimeComponents then
  set currentDueDateComponents to r's dueDateComponents()
  set theDueDate's hours to (currentDueDateComponents's hour as integer)
  set theDueDate's minutes to (currentDueDateComponents's minute as integer)
end if

set currentStartDateComponents to r's startDateComponents()

r's setDueDateComponents:getDateComponents(theDueDate, unitFlags)
r's setStartDateComponents:currentStartDateComponents
${alarmScript}`;
    }

    return `r's setDueDateComponents:(missing value)

if (r's isAllDay as boolean) = false then
  set theStartDateComponents to r's startDateComponents()
  if theStartDateComponents is not missing value then
    set curApp to current application
    set gregCalId to curApp's NSCalendarIdentifierGregorian
    set gregCal to curApp's NSCalendar's alloc()'s initWithCalendarIdentifier:gregCalId
    set theDate to gregCal's dateFromComponents:theStartDateComponents
    set theComponents to gregCal's components:30 fromDate:theDate
    r's setStartDateComponents:theComponents
  end if
end if
${alarmScript}`;
  },

  group: (group) => (group.id ? `r's setCalendar:(theStore's calendarWithIdentifier:"${group.id}")` : null),

  // EventKit doesn't expose tags.
  tags: () => null,

  notes: (notes) => `r's setNotes:${notes ? quoteAndEscape(notes) : "missing value"}`,

  priority: (priority) => `r's setPriority:${priority}`,
};

// Saves the given created or modified event to the given store.
const save = `
on saveReminder(theReminder, theStore)
  set {theResult, theError} to theStore's saveReminder:theReminder commit:true |error|:(reference)
  if not theResult as boolean then error (theError's |localizedDescription|() as text)
end saveReminder`;

// Extracts date components from the given date using `NSGregorianCalendar`, a requirement for `dueDateComponents`.
// `unitFlags`: 30 extracts eras, years, months and days only; 254 also includes hours, minutes, and seconds.
// The timeZone is set to the system time zone only if time components are included (consistent with the Reminders app).
const dateComponents = `
on getUnitFlags(includeTimeComponents)
  if includeTimeComponents then
    return 254
  else
    return 30
  end if
end getUnitFlags

on getDateComponents(d, unitFlags)
  set curApp to current application
	set gregCalId to curApp's NSCalendarIdentifierGregorian
	set gregCal to curApp's NSCalendar's alloc()'s initWithCalendarIdentifier:gregCalId
  set theComponents to gregCal's components:unitFlags fromDate:d
  if unitFlags > 30 then
    theComponents's setTimeZone:(gregCal's timeZone())
  end if
  return theComponents
end getDateComponents`;

function getSetPropertyLines<T extends Partial<UpdateTodoData>>(data: T): SetPropertyLine[] {
  const setPropertyLines: SetPropertyLine[] = [];
  for (const [key, value] of Object.entries(data)) {
    const appleScript = appleScripter[key as keyof UpdateTodoData](
      value as Subset<Partial<UpdateTodoData>, T>[keyof UpdateTodoData]
    );
    if (appleScript) {
      setPropertyLines.push(appleScript);
    }
  }
  return setPropertyLines;
}

export async function createTodo(data: TodoFormData): Promise<Pick<TodoCore, "todoId" | "url">> {
  // The `title` and `calendar` (a.k.a. `data.group`) properties are required by EventKit.
  const setPropertyLines = getSetPropertyLines(data);
  const main = `
    set r to current application's EKReminder's reminderWithEventStore:theStore
    ${setPropertyLines.join("\n")}
    saveReminder(r, theStore)
    return r's calendarItemIdentifier() as text`;
  const todoId = await runAppleScript(initStore(0) + main + save + dateComponents);

  return { todoId, url: REMINDERS_URL_PREFIX + todoId };
}

export async function updateTodo<T extends Partial<UpdateTodoData>>(
  todoId: string,
  editedProperties: Subset<Partial<UpdateTodoData>, T>
): Promise<void> {
  const setPropertyLines = getSetPropertyLines(editedProperties);
  if (setPropertyLines.length > 0) {
    const main = `
      set r to theStore's calendarItemWithIdentifier:"${todoId}"
      ${setPropertyLines.join("\n")}
      saveReminder(r, theStore)`;
    await runAppleScript(initStore(1) + main + save + dateComponents);
  }
}

export async function deleteTodo(todoId: string): Promise<void> {
  const main = `
    set r to theStore's calendarItemWithIdentifier:"${todoId}"
    set {theResult, theError} to theStore's removeReminder:r commit:true |error|:(reference)
    if not theResult as boolean then error (theError's |localizedDescription|() as text)`;
  await runAppleScript(initStore(1) + main);
}
