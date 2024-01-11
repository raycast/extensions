const FetchPopiconsErrorReason = {
  ResponseNotOk: "response-not-ok",
  InvalidJson: "invalid-json",
  FailedValidation: "failed-validation",
} as const;

type FetchPopiconsErrorReason = (typeof FetchPopiconsErrorReason)[keyof typeof FetchPopiconsErrorReason];

export { FetchPopiconsErrorReason };
