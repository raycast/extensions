import { busyCalDateString } from "./busycal-form-values";
import {
  BusyCalEventInput,
  BusyCalTaskInput,
  EventFormValues,
  TaskFormValues,
} from "./types";

/**
 * Normalizes Raycast event form values into the exact payload accepted by BusyCal automation.
 *
 * - Parameter values: Structured event form values from Raycast.
 * - Returns: The BusyCal automation payload for event creation.
 * - Throws: When the title is empty or the end date precedes the start date.
 */
export function buildBusyCalEventInput(
  values: EventFormValues,
): BusyCalEventInput {
  const trimmedTitle = values.title.trim();
  if (!trimmedTitle) {
    throw new Error("Enter an event title.");
  }

  // BusyCal can infer defaults, but rejecting an inverted range in Raycast
  // keeps the validation error attached to the form the user is editing.
  if (values.endDate.getTime() < values.startDate.getTime()) {
    throw new Error("The event end time must be on or after the start time.");
  }

  const trimmedCalendarID = emptyToUndefined(values.calendarID);
  const trimmedLocation = emptyToUndefined(values.location);
  const trimmedNotes = emptyToUndefined(values.notes);

  return {
    title: trimmedTitle,
    calendarID: trimmedCalendarID,
    startDate: busyCalDateString(values.startDate, values.allDay),
    endDate: busyCalDateString(values.endDate, values.allDay),
    allDay: values.allDay,
    location: trimmedLocation,
    notes: trimmedNotes,
  };
}

/**
 * Normalizes Raycast task form values into the exact payload accepted by BusyCal automation.
 *
 * - Parameter values: Structured task form values from Raycast.
 * - Returns: The BusyCal automation payload for task creation.
 * - Throws: When the title is empty.
 */
export function buildBusyCalTaskInput(
  values: TaskFormValues,
): BusyCalTaskInput {
  const trimmedTitle = values.title.trim();
  if (!trimmedTitle) {
    throw new Error("Enter a task title.");
  }

  const trimmedCalendarID = emptyToUndefined(values.calendarID);
  const trimmedNotes = emptyToUndefined(values.notes);

  return {
    title: trimmedTitle,
    calendarID: trimmedCalendarID,
    dueDate: values.hasDueDate
      ? busyCalDateString(values.dueDate, false)
      : undefined,
    notes: trimmedNotes,
  };
}

/**
 * Trims optional form strings so BusyCal only receives meaningful fields.
 */
function emptyToUndefined(value?: string): string | undefined {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : undefined;
}
