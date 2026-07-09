import { Color, Icon, showToast, Toast } from "@raycast/api";
import { KyoError } from "../api/client";
import { PRIORITY_LABELS } from "../api/types";

export function formatCurrency(value?: number): string | undefined {
  if (value === undefined || value === null) return undefined;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Raycast's DatePicker returns a Date at local midnight, but Kyo's date columns
 * are Postgres `date`. Serializing with toISOString() shifts users east of UTC
 * onto the PREVIOUS day — format the local calendar date instead.
 */
export function toDateOnly(value?: Date | null): string | null {
  if (!value) return null;
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatDate(value?: string): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function priorityLabel(priority?: number): string {
  if (priority === undefined || priority === null) return PRIORITY_LABELS[0];
  return PRIORITY_LABELS[priority] ?? String(priority);
}

export function priorityColor(priority?: number): Color {
  switch (priority) {
    case 4:
      return Color.Red;
    case 3:
      return Color.Orange;
    case 2:
      return Color.Yellow;
    case 1:
      return Color.Blue;
    default:
      return Color.SecondaryText;
  }
}

export function taskStatusIcon(completed?: boolean) {
  return completed
    ? { source: Icon.CheckCircle, tintColor: Color.Green }
    : { source: Icon.Circle, tintColor: Color.SecondaryText };
}

/** Turn any thrown error (KyoError or otherwise) into a helpful Raycast toast. */
export async function showKyoError(
  error: unknown,
  title = "Something went wrong",
): Promise<void> {
  if (error instanceof KyoError) {
    let message = error.message;
    if (error.code === "insufficient_scope") {
      message =
        "Your Kyo grant is missing a required scope. Log out and sign in again to re-grant.";
    } else if (error.code === "insufficient_credits") {
      message = "Workspace credit balance is too low for this action.";
    } else if (error.code === "rate_limited") {
      message = "Rate limit hit. Wait a moment and try again.";
    }
    await showToast({
      style: Toast.Style.Failure,
      title,
      message: error.requestId
        ? `${message} (request ${error.requestId})`
        : message,
    });
    return;
  }
  await showToast({
    style: Toast.Style.Failure,
    title,
    message: error instanceof Error ? error.message : String(error),
  });
}

/** Build a fast id->name lookup map from a list of records. */
export function indexByName<T extends { id: string; name?: string }>(
  items: T[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const item of items) {
    if (item.name) map.set(item.id, item.name);
  }
  return map;
}
