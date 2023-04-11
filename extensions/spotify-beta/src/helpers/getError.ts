import { HttpError } from "oazapfts";

type ErrorObj = {
  status: number;
  message: string;
  reason?: string;
};

export function getError(error: unknown): ErrorObj {
  console.log("getError", error);
  if (error instanceof HttpError) {
    if (typeof error.data === "string") {
      try {
        const parsedError = JSON.parse(error.data);
        return parsedError.error;
      } catch {
        return {
          status: error.status,
          message: error.data,
          reason: "UNKNOWN_ERROR",
        };
      }
    } else {
      return error.data.error;
    }
  }
  return {
    status: 500,
    message: "Unknown error",
    reason: "UNKNOWN_ERROR",
  };
}

export function getErrorMessage(error: unknown): string {
  console.log("--- start getErrorMessage ---");
  console.log("error", error);
  // console.log("error", JSON.parse(error.data));
  console.log("--- end getErrorMessage ---");
  if (error instanceof HttpError) {
    try {
      console.log("typeof error.data", typeof error.data);
      const parsedError = JSON.parse(error.data);
      // console.log("parsedError", parsedError);
      // console.log("parsedError.error.message", parsedError.error.message);
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
