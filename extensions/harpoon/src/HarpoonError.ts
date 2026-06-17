export enum ErrorCode {
  itemNotFound = "ITEM_NOT_FOUND",
  unableToGetList = "UNABLE_TO_GET_LIST",
  unableToSetList = "UNABLE_TO_SET_LIST",
}

const errorMessages: Record<ErrorCode, string> = {
  [ErrorCode.itemNotFound]: "Unable to find application in list",
  [ErrorCode.unableToGetList]: "Unable to get application list",
  [ErrorCode.unableToSetList]: "Unable to set application list",
};

export default class HarpoonError extends Error {
  public code: ErrorCode;

  constructor(code: ErrorCode) {
    super(errorMessages[code]);

    this.name = "HarpoonError";
    this.code = code;
  }
}
