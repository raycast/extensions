import { HttpError } from "oazapfts";

export function getErrorMessage(error: unknown): string {
  console.log("--- start getErrorMessage ---");
  console.log("error", error);
  console.log("--- end getErrorMessage ---");
  if (error instanceof HttpError) {
    try {
      const parsedError = JSON.parse(error.data);
      return parsedError.error.message;
    } catch {
      if (typeof error.data === "string") {
        return error.data;
      }
      return error.data.error.message;
    }
  }
  return String(error);
}
