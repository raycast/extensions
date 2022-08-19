import { XcodeReleaseSDK } from "./xcode-release-sdk.model";

/**
 * A Xcode Release
 */
export interface XcodeRelease {
  /**
   * The name
   */
  name: string;
  /**
   * The date of the release
   */
  date: Date;
  /**
   * The version number
   */
  versionNumber: string;
  /**
   * The build number
   */
  buildNumber: string;
  /**
   * The optional beta number
   */
  beta: number | undefined;
  /**
   * The optional xcode-release candidate (RC) number
   */
  releaseCandidate: number | undefined;
  /**
   * The SDKs embedded within this release
   */
  sdks: XcodeReleaseSDK[];
  /**
   * The optional Swift version that is bundled with this release
   */
  swiftVersion: string | undefined;
  /**
   * The optional release notes link
   */
  releaseNotesLink: string | undefined;
  /**
   * The optional download link
   */
  downloadLink: string | undefined;
}
