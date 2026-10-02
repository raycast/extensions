import { Clipboard, Toast } from "@raycast/api";

// Every failure toast offers Copy Error, so the user can paste what went wrong into a report.
export const copyError = (error: unknown): Toast.ActionOptions => ({
  title: "Copy Error",
  onAction: () => Clipboard.copy(error instanceof Error ? error.message : String(error)),
});
