import { HttpError } from "oazapfts";

type ErrorObj = {
  status: number;
  message: string;
  reason?: string;
  isAuthError?: boolean;
};

export function getError(error: unknown): ErrorObj {
  console.log("getError", error);
  if (error instanceof HttpError) {
    const isAuthError = error.status === 401 || error.status === 403;

    if (typeof error.data === "string") {
      try {
        const parsedError = JSON.parse(error.data);
        return { ...parsedError.error, isAuthError };
      } catch {
        return {
          status: error.status,
          message: error.data,
          reason: "UNKNOWN_ERROR",
          isAuthError,
        };
      }
    } else {
      return { ...error.data.error, isAuthError };
    }
  }
  return {
    status: 500,
    message: "Unknown error",
    reason: "UNKNOWN_ERROR",
    isAuthError: false,
  };
}

export function getErrorMessage(error: unknown): string {
  console.log("--- start getErrorMessage ---");
  console.log("error", error);
  console.log("--- end getErrorMessage ---");

  if (error instanceof HttpError) {
    // Check for auth errors and provide user-friendly messages
    if (error.status === 401) {
      return "Authentication expired. Please try again - you may need to re-authenticate.";
    }
    if (error.status === 403) {
      return "Access denied. Please check your Spotify Premium subscription or re-authenticate.";
    }

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

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function isAuthError(error: unknown): boolean {
  if (error instanceof HttpError) {
    return error.status === 401 || error.status === 403;
  }
  return false;
}
