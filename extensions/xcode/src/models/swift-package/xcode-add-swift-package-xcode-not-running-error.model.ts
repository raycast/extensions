/**
 * An Error that indicates that Xcode is currently not running
 * when trying to add a Swift Package
 */
export class XcodeAddSwiftPackageXcodeNotRunningError extends Error {

  /**
   * Constructor
   */
  constructor() {
    super("Xcode is not running");
  }

}
