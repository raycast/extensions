import { OperationResult } from "../domain/models";

export function operationMessage(result: OperationResult<unknown>): string {
  switch (result.status) {
    case "failed":
      return result.error;
    case "unavailable":
      return result.recovery ? `${result.reason} ${result.recovery}` : result.reason;
    case "permission_required":
      return `${result.permission}: ${result.recovery}`;
    case "cancelled":
      return "The operation was cancelled.";
    case "succeeded":
      return "Completed.";
  }
}
