import { LocalPopiconsErrorReason } from "../enums/local-popicons-error-reason";
import { exhaustive } from "../utilities/exhaustive";

function getErrorMessage(reason: LocalPopiconsErrorReason): string {
  switch (reason) {
    case LocalPopiconsErrorReason.AssetNotReadable:
      return "Local Popicons asset could not be read";
    case LocalPopiconsErrorReason.InvalidJson:
      return "Local Popicons asset did not contain valid JSON";
    case LocalPopiconsErrorReason.FailedValidation:
      return "Content of local Popicons asset did not pass validation";
    default:
      return exhaustive(reason, `Unknown reason: ${reason}`);
  }
}

class LocalPopiconsError extends Error {
  constructor(public readonly reason: LocalPopiconsErrorReason) {
    super(getErrorMessage(reason));
    this.name = "LocalPopiconsError";
  }
}

export { LocalPopiconsError };
