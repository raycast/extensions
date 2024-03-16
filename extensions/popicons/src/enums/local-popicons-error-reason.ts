const LocalPopiconsErrorReason = {
  AssetNotReadable: "asset-not-readable",
  InvalidJson: "invalid-json",
  FailedValidation: "failed-validation",
} as const;

type LocalPopiconsErrorReason = (typeof LocalPopiconsErrorReason)[keyof typeof LocalPopiconsErrorReason];

export { LocalPopiconsErrorReason };
