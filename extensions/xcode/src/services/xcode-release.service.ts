import { XcodeRelease } from "../models/xcode-release/xcode-release.model";
import fetch from "node-fetch";
import { XcodeReleaseSDK } from "../models/xcode-release/xcode-release-sdk.model";

/**
 * XcodeReleaseService
 */
export class XcodeReleaseService {
  /**
   * Retrieve XcodeReleases
   */
  static async xcodeReleases(): Promise<XcodeRelease[]> {
    // Fetch Response from https://xcodereleases.com
    const response = await fetch("https://xcodereleases.com/data.json");
    // Retrieve JSON array from response
    const jsonArray = (await response.json()) as any[];
    // Decode each entry to a XcodeRelease
    return jsonArray.map((rawXcodeRelease) => {
      return {
        name: rawXcodeRelease.name,
        date: new Date(rawXcodeRelease.date.year, rawXcodeRelease.date.month, rawXcodeRelease.date.day),
        versionNumber: rawXcodeRelease.version.number,
        buildNumber: rawXcodeRelease.version.build,
        beta: rawXcodeRelease.version.release.beta,
        releaseCandidate: rawXcodeRelease.version.release.rc,
        sdks: (() => {
          // Initialize XcodeReleaseSDK array
          let sdks: XcodeReleaseSDK[] = [];
          // For each property
          for (const sdk in rawXcodeRelease.sdks) {
            // Push XcodeReleaseSDK
            sdks.push({
              name: sdk,
              version: rawXcodeRelease.sdks[sdk][0].number,
            });
          }
          // Sort SDKs alphabetically
          sdks = sdks.sort((lhs, rhs) => {
            return lhs.name.localeCompare(rhs.name);
          });
          // Return XcodeReleaseSDKs
          return sdks;
        })(),
        swiftVersion: rawXcodeRelease.compilers?.swift?.at(0)?.number,
        releaseNotesLink: rawXcodeRelease.links?.notes?.url,
        downloadLink: rawXcodeRelease.links?.download?.url,
      };
    });
  }
}
