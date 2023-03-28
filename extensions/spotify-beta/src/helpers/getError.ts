import { HttpError } from "oazapfts";

type ErrorObj = {
  status: number;
  message: string;
  reason?: string;
};

export function getError(error: unknown): ErrorObj {
  if (error instanceof HttpError) return error.data.error;
  return {
    status: 500,
    message: "Unknown error",
    reason: "UNKNOWN_ERROR",
  };
}
