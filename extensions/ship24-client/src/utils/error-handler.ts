import { showFailureToast } from "@raycast/utils";

export function handleApiError(error: unknown, title: string): void {
  let message = "Unknown error occurred";

  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === "object" && error !== null) {
    const errorObj = error as { message?: string; error?: string };
    if (errorObj.message) {
      message = errorObj.message;
    } else if (errorObj.error) {
      message = errorObj.error;
    } else {
      message = JSON.stringify(error, null, 2);
    }
  }

  showFailureToast(new Error(message), {
    title,
  });
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  } else if (typeof error === "object" && error !== null) {
    const errorObj = error as { message?: string; error?: string };
    if (errorObj.message) {
      return errorObj.message;
    } else if (errorObj.error) {
      return errorObj.error;
    } else {
      return JSON.stringify(error, null, 2);
    }
  }
  return "Unknown error occurred";
}
