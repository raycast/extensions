import { showToast, Toast } from "@raycast/api";

export function handleError(error: unknown, context: string) {
  console.error(`Error in ${context}:`, error);
  if (error instanceof Error) {
    showToast({
      style: Toast.Style.Failure,
      title: `${context} Failed`,
      message: error.message,
    });
  } else {
    showToast({
      style: Toast.Style.Failure,
      title: `${context} Failed`,
      message: "An unexpected error occurred.",
    });
  }
}
