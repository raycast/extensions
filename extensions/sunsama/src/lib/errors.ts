import { Toast, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

/** Raised when Sunsama sign-in is required (no tokens, or refresh failed). */
export class AuthRequiredError extends Error {
  constructor() {
    super("Sunsama sign-in required. Run the command again to sign in.");
    this.name = "AuthRequiredError";
  }
}

/** Raised when Sunsama rate-limits requests (HTTP 429). */
export class RateLimitError extends Error {
  constructor() {
    super(
      "Sunsama is rate-limiting requests. Wait a few minutes and try again.",
    );
    this.name = "RateLimitError";
  }
}

/**
 * Surface an error as a toast. Known errors get tailored messaging; everything
 * else shows the underlying message verbatim so server errors are not hidden.
 */
export async function reportError(
  error: unknown,
  title = "Something went wrong",
): Promise<void> {
  if (error instanceof AuthRequiredError) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Sign in to Sunsama",
      message: "Authorization expired or missing — run the command again.",
    });
    return;
  }

  if (error instanceof RateLimitError) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Rate limited by Sunsama",
      message: "Too many requests. Wait a few minutes and try again.",
    });
    return;
  }

  await showFailureToast(error, { title });
}

/**
 * Run an action behind a progress toast: animated while it runs, success when
 * it lands, and the shared error reporting when it throws. Returns whether the
 * action succeeded, so callers can refresh or navigate only on success.
 */
export async function runWithToast(
  labels: { pending: string; success: string; failure: string },
  action: () => Promise<unknown>,
): Promise<boolean> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: labels.pending,
  });
  try {
    await action();
    toast.style = Toast.Style.Success;
    toast.title = labels.success;
    return true;
  } catch (error) {
    await toast.hide();
    await reportError(error, labels.failure);
    return false;
  }
}
