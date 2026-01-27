import { showToast, Toast } from "@raycast/api";

/**
 * Helper utilities for displaying toast notifications.
 * Provides consistent and reusable toast patterns across the extension.
 */

/**
 * Shows a loading toast followed by a success or error toast based on the operation result.
 *
 * @param operation - Description of the operation (e.g., "Creating coupon")
 * @param action - Async function to execute
 * @param successMessage - Message to show on success
 * @returns Result of the action function
 *
 * @example
 * ```typescript
 * await showOperationToast(
 *   "Creating customer",
 *   async () => await stripe.customers.create({ email }),
 *   "Customer created successfully"
 * );
 * ```
 *
 * @throws Re-throws any error from the action function after showing error toast
 */
export const showOperationToast = async <T>(
  operation: string,
  action: () => Promise<T>,
  successMessage: string,
): Promise<T> => {
  await showToast({
    style: Toast.Style.Animated,
    title: `${operation}...`,
  });

  try {
    const result = await action();

    await showToast({
      style: Toast.Style.Success,
      title: successMessage,
    });

    return result;
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: `Failed to ${operation.toLowerCase()}`,
      message: error instanceof Error ? error.message : "Unknown error occurred",
    });

    throw error;
  }
};

/**
 * Shows a success toast notification.
 *
 * @param title - Toast title
 * @param message - Optional toast message
 *
 * @example
 * ```typescript
 * await showSuccessToast("Saved!", "Your changes have been saved");
 * ```
 */
export const showSuccessToast = async (title: string, message?: string): Promise<void> => {
  await showToast({
    style: Toast.Style.Success,
    title,
    message,
  });
};

/**
 * Shows an error toast notification.
 *
 * @param title - Toast title
 * @param message - Optional toast message
 *
 * @example
 * ```typescript
 * await showErrorToast("Operation failed", "Please try again");
 * ```
 */
export const showErrorToast = async (title: string, message?: string): Promise<void> => {
  await showToast({
    style: Toast.Style.Failure,
    title,
    message,
  });
};

/**
 * Shows a loading toast notification.
 *
 * @param title - Toast title
 * @param message - Optional toast message
 *
 * @example
 * ```typescript
 * await showLoadingToast("Loading customers...");
 * ```
 */
export const showLoadingToast = async (title: string, message?: string): Promise<void> => {
  await showToast({
    style: Toast.Style.Animated,
    title,
    message,
  });
};
