/**
 * A Xcode Simulator Open Url Error
 */
export class XcodeSimulatorOpenUrlError extends Error {
  /**
   * Creates a new instance of `XcodeSimulatorOpenUrlError`
   * @param reason The reason why the url could not be opened
   */
  constructor(public reason: XcodeSimulatorOpenUrlErrorReason) {
    super(reason);
  }
}

/**
 * A Xcode Simulator Open Url Error Reason
 */
export enum XcodeSimulatorOpenUrlErrorReason {
  badUrl = "Bad Url",
  xcodeInstallationMissing = "Xcode is not installed",
  bootedSimulatorMissing = "No simulator booted",
}
