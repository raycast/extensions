import { FetchPopiconsErrorReason } from "../enums/fetch-popicons-error-reason";
import { exhaustive } from "../utilities/exhaustive";

function getErrorMessage(reason: FetchPopiconsErrorReason): string {
  switch (reason) {
    case FetchPopiconsErrorReason.ResponseNotOk:
      return "Response from Popicons API was not ok";
    case FetchPopiconsErrorReason.InvalidJson:
      return "Response from Popicons API did not include valid JSON";
    case FetchPopiconsErrorReason.FailedValidation:
      return "Response from Popicons API did not pass validation";
    default:
      return exhaustive(reason, `Unknown reason: ${reason}`);
  }
}

class FetchPopiconsError extends Error {
  constructor(public readonly reason: FetchPopiconsErrorReason) {
    super(getErrorMessage(reason));
    this.name = "FetchPopiconsError";
  }
}

export { FetchPopiconsError };
