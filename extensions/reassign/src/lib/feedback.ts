import { showToast, Toast } from "@raycast/api";
import { ApiError, ApiResult, undo } from "./api";

// Toast and error helpers shared by the mutating commands.

export const PRO_REQUIRED_TITLE = "Reassign Pro required";
export const PRO_REQUIRED_MESSAGE =
  "Your account needs an active Pro plan to use this extension. Open Reassign to upgrade.";

/** A short, human title for a refusal code. */
export function describeError(error: ApiError): { title: string; message?: string } {
  switch (error.code) {
    case "permission":
      return { title: PRO_REQUIRED_TITLE, message: PRO_REQUIRED_MESSAGE };
    case "unauthenticated":
    case "unauthorized":
      return { title: "Sign in to Reassign", message: error.message };
    case "scope":
      return {
        title: "Connect Reassign again",
        message: "The connection does not have a permission it needs. Sign in again.",
      };
    case "read_only":
      return {
        title: "This block is read-only",
        message: "It comes from a calendar you do not own. Change it in that calendar.",
      };
    case "not_found":
      return { title: "Could not find that block", message: error.message };
    case "validation":
      return { title: "Check the details", message: error.message };
    case "conflict":
      return { title: "That time is already taken", message: error.message };
    case "ambiguous":
      return { title: "More than one block matches", message: error.message };
    case "rate_limited":
      return { title: "Too many requests", message: "Wait a moment, then try again." };
    case "network":
      return { title: "Could not reach Reassign", message: error.message };
    default:
      return { title: "Something went wrong", message: error.message };
  }
}

/** Show a failure toast for an API error. */
export async function showApiError(error: ApiError): Promise<void> {
  const { title, message } = describeError(error);
  await showToast({ style: Toast.Style.Failure, title, message });
}

/** Turn an existing toast into a failure toast for an API error. */
export function failToast(toast: Toast, error: ApiError): void {
  const { title, message } = describeError(error);
  toast.style = Toast.Style.Failure;
  toast.title = title;
  toast.message = message;
}

/** Add the standard cmd+Z Undo button to a finished toast. */
export function applyUndoToast(toast: Toast, token: string): void {
  toast.primaryAction = {
    title: "Undo",
    shortcut: { modifiers: ["cmd"], key: "z" },
    onAction: async (t) => {
      t.style = Toast.Style.Animated;
      t.title = "Undoing…";
      const undone = await undo([token]);
      t.style = undone.ok ? Toast.Style.Success : Toast.Style.Failure;
      t.title = undone.ok ? "Undid the change" : "Could not undo the change";
    },
  };
}

/**
 * Run a mutating call, show progress, then a success toast with an Undo button
 * when the result carries an undo token. Returns the token or null.
 * `getUndoToken` defaults to the `undoToken` field on a batch receipt.
 */
export async function runMutation<T>(
  loadingTitle: string,
  successTitle: string,
  call: () => Promise<ApiResult<T>>,
  getUndoToken: (data: T) => string | null = defaultUndoToken,
): Promise<string | null> {
  const toast = await showToast({ style: Toast.Style.Animated, title: loadingTitle });
  const result = await call();
  if (!result.ok) {
    failToast(toast, result);
    return null;
  }
  // A 2xx can still carry a rejected row (applied:0, failed:1). Treat it as a
  // failure, not a false success.
  const failed = (result.data as { failed?: number }).failed;
  if (typeof failed === "number" && failed > 0) {
    toast.style = Toast.Style.Failure;
    toast.title = "The change did not apply";
    toast.message = "The server rejected it.";
    return null;
  }
  const token = getUndoToken(result.data);
  toast.style = Toast.Style.Success;
  toast.title = successTitle;
  if (token) applyUndoToast(toast, token);
  return token;
}

function defaultUndoToken(data: unknown): string | null {
  return (data as { undoToken?: string }).undoToken ?? null;
}
