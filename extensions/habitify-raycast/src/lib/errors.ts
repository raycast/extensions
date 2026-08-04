import { isHabitifyError } from "./habitify";

export function formatHabitifyErrorMessage(err: unknown): string {
  if (isHabitifyError(err)) {
    return `Habitify returned ${err.status}: ${err.message}`;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "Unknown error";
}
