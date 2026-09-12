import { showToast, Toast } from "@raycast/api";

/**
 * OperationWithUserFeedback Result
 */
export interface OperationWithUserFeedbackResult<T> {
  /**
   * Bool value if operation succeeded or failed
   */
  isSuccess: boolean;
  /**
   * The optional generic Result
   */
  result?: T;
  /**
   * The Toast
   */
  toast: Toast;
}

/**
 * Perform an operation with user feedback while loading, on success and on failure
 * @param loadingTitle The loading title while the operation is running
 * @param successTitle The success title when the operation succeeded
 * @param failureTitle The failure title when the operation failed
 * @param operation The operation to perform
 */
export async function operationWithUserFeedback<T>(
  loadingTitle: string,
  successTitle: string,
  failureTitle: string,
  operation: () => Promise<T>
): Promise<OperationWithUserFeedbackResult<T>> {
  // Show Toast
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: loadingTitle,
  });
  try {
    // Perform operation
    const result = await operation();
    // Show success Toast
    toast.style = Toast.Style.Success;
    toast.title = successTitle;
    return {
      isSuccess: true,
      result: result,
      toast: toast,
    };
  } catch (error) {
    // Log error
    console.error(error);
    // Show failure Toast
    toast.style = Toast.Style.Failure;
    toast.title = failureTitle;
    toast.message = `${error}`;
    return {
      isSuccess: false,
      toast: toast,
    };
  }
}
