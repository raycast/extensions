import { LaunchProps, showToast, Toast } from "@raycast/api";
import * as chrono from "chrono-node";
import { addTask } from "./utils/taskOperations";

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const parseIsoDate = (dateText: string): Date | undefined => {
  const [year, month, day] = dateText.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return undefined;
  }

  return date;
};

const toUtcDateOnly = (date: Date): Date => {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
};

const parseDateArgument = async (dateArgument: string | undefined): Promise<Date | undefined> => {
  const dateText = dateArgument?.trim();

  if (!dateText) {
    return undefined;
  }

  if (ISO_DATE_REGEX.test(dateText)) {
    const isoDate = parseIsoDate(dateText);

    if (isoDate) {
      return isoDate;
    }

    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid date",
      message: "Use a valid YYYY-MM-DD date.",
    });
    return undefined;
  }

  const parsedDate = chrono.parseDate(dateText, new Date(), { forwardDate: true });

  if (!parsedDate) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid date",
      message: "Use YYYY-MM-DD or a natural language date like tomorrow.",
    });
    return undefined;
  }

  return toUtcDateOnly(parsedDate);
};

const formatInlineTags = (tagsArgument: string | undefined): string => {
  const tags = tagsArgument
    ?.split(",")
    .map((tag) => tag.trim().replace(/^#/, "").replace(/\s+/g, "-"))
    .filter(Boolean)
    .map((tag) => `#${tag}`);

  return tags?.length ? ` ${tags.join(" ")}` : "";
};

export default async function Command(props: LaunchProps<{ arguments: Arguments.QuickAddTask }>) {
  const description = props.arguments.description.trim();

  if (!description) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Reminder is required",
    });
    return;
  }

  const dateText = props.arguments.date?.trim();
  const dueDate = await parseDateArgument(dateText);

  if (dateText && !dueDate) {
    return;
  }

  const inlineTags = formatInlineTags(props.arguments.tags);

  try {
    await addTask({
      description: `${description}${inlineTags}`,
      completed: false,
      dueDate,
    });
  } catch {
    return;
  }
}
