export function getErrorMessage(error: unknown, defaultMsg: string): string {
  if (error instanceof Error) {
    return error.message;
  } else if (typeof error === "string") {
    return error;
  } else {
    return defaultMsg;
  }
}
