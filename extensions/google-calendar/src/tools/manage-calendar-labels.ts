import { Action } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { mergeEventLabels } from "../lib/calendar-values";
import {
  getCalendarWithLabels,
  getEventLabels,
  normalizeHexColor,
  replaceEventLabels,
  requireCalendarOwner,
  requireLabel,
  serializeCalendar,
} from "../lib/calendar-resources";
import { withGoogleAPIs } from "../lib/google";

type Input = {
  /** Operation to perform. List is read-only; all other operations require owner access. */
  action: "list" | "create" | "rename" | "recolor" | "delete";
  /** Calendar ID from list-calendars. Defaults to "primary". */
  calendarId?: string;
  /** Label ID from this tool's list action. Required for rename, recolor, and delete. */
  labelId?: string;
  /** Label name, at most 50 characters. Required for create and rename. */
  name?: string;
  /** Six-digit hexadecimal background color, for example #039be5. Required for create and recolor. */
  backgroundColor?: string;
};

function validate(input: Input) {
  if (input.action === "create" || input.action === "rename") {
    if (input.name === undefined) throw new Error(`name is required to ${input.action} a label.`);
    if (input.name.length > 50) throw new Error("Label names can contain at most 50 characters.");
  }
  if (input.action === "create" || input.action === "recolor") {
    if (!input.backgroundColor) throw new Error(`backgroundColor is required to ${input.action} a label.`);
    normalizeHexColor(input.backgroundColor, "backgroundColor");
  }
  if (input.action === "rename" || input.action === "recolor" || input.action === "delete") {
    if (!input.labelId) throw new Error(`labelId is required to ${input.action} a label.`);
  }
}

export const confirmation = withGoogleAPIs(async (input: Input) => {
  if (input.action === "list") return undefined;
  validate(input);
  const calendarId = input.calendarId ?? "primary";
  await requireCalendarOwner(calendarId);
  const calendar = await getCalendarWithLabels(calendarId);
  const labels = getEventLabels(calendar);
  const existing = input.labelId ? requireLabel(labels, input.labelId) : undefined;
  return {
    style: input.action === "delete" ? Action.Style.Destructive : Action.Style.Regular,
    message:
      input.action === "delete"
        ? "Delete this custom event label from the calendar?"
        : `${input.action.charAt(0).toUpperCase() + input.action.slice(1)} this custom event label?`,
    info: [
      { name: "Calendar", value: calendar.summary ?? calendarId },
      { name: "Label", value: existing?.name ?? input.name },
      { name: "Label ID", value: input.labelId },
      { name: "New Name", value: input.action === "rename" ? input.name : undefined },
      { name: "New Color", value: input.backgroundColor },
    ],
  };
});

const tool = async (input: Input) => {
  validate(input);
  const calendarId = input.calendarId ?? "primary";
  const calendar = await getCalendarWithLabels(calendarId);
  const labels = getEventLabels(calendar);
  if (input.action === "list") return serializeCalendar(calendar);

  await requireCalendarOwner(calendarId);
  let updatedLabels;
  if (input.action === "create") {
    if (labels.length >= 200) throw new Error("This calendar already has the maximum of 200 event labels.");
    updatedLabels = mergeEventLabels(labels, {
      action: "create",
      id: randomUUID(),
      name: input.name!,
      backgroundColor: input.backgroundColor!,
    });
  } else {
    updatedLabels =
      input.action === "rename"
        ? mergeEventLabels(labels, { action: "rename", labelId: input.labelId!, name: input.name! })
        : input.action === "recolor"
          ? mergeEventLabels(labels, {
              action: "recolor",
              labelId: input.labelId!,
              backgroundColor: input.backgroundColor!,
            })
          : mergeEventLabels(labels, { action: "delete", labelId: input.labelId! });
  }

  const updated = await replaceEventLabels(calendarId, calendar, updatedLabels);
  return serializeCalendar(updated);
};

export default withGoogleAPIs(tool);
