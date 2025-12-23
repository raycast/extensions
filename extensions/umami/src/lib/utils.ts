import { UmamiErrorResponse } from "./types";

export const handleUmamiError = (error: unknown) => {
  if (error instanceof Error) throw new Error(error.message);
  let message = "";
  if (typeof error === "string") {
    try {
      const json: UmamiErrorResponse = JSON.parse(error);
      message = json.error.message;
    } catch {
      message = error;
    }
  }
  throw new Error(message || "Unknown Error");
};
