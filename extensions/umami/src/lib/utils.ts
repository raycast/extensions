import { UmamiErrorResponse } from "./types";

export const handleUmamiError = (error: unknown) => {
  if (error === undefined) return;
  if (error instanceof Error) throw new Error(error.message);
  if (typeof error === "string") {
    let message = "";
    try {
      const json: UmamiErrorResponse = JSON.parse(error);
      message = json.error.message;
    } catch {
      message = error;
    }
    throw new Error(message || "Unknown Error");
  }
};
