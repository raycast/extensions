import { XcodeRelease } from "../models/release/xcode-release.model";
import { XcodeReleaseSDK } from "../models/release/xcode-release-sdk.model";
import { getLocalStorageItem, setLocalStorageItem } from "@raycast/api";
import fetch from "node-fetch";

/**
 * XcodeReleaseService
 */
export class XcodeReleaseService {
  /**
   * The XcodeReleases JSON LocalStorage Key
   */
  private xcodeReleasesJSONLocalStorageKey = "xcode-releases";

  /**
   * Retrieve the cached XcodeReleases, if available
   */
  async cachedXcodeReleases(): Promise<XcodeRelease[] | undefined> {
    // Retrieve XcodeReleases JSON from LocalStorage
    const xcodeReleasesJSON = await getLocalStorageItem<string>(this.xcodeReleasesJSONLocalStorageKey);
    // Check if XcodeReleases JSON is not available
    if (!xcodeReleasesJSON) {
      // Return undefined
      return undefined;
    }
    // Return parsed XcodeReleases
    return JSON.parse(xcodeReleasesJSON);
  }

  /**
   * Cache XcodeReleases
   * @param xcodeReleases The XcodeReleases that should be cached
   */
  private async cacheXcodeReleases(xcodeReleases: XcodeRelease[]) {
    // Store XcodeReleases JSON in LocalStorage
    return setLocalStorageItem(this.xcodeReleasesJSONLocalStorageKey, JSON.stringify(xcodeReleases));
  }

  /**
   * Retrieve XcodeReleases
   */
  async xcodeReleases(): Promise<XcodeRelease[]> {
    // Fetch Response from https://xcodereleases.com
    const response = await fetch("https://xcodereleases.com/data.json");
    // Retrieve JSON array from response
    const jsonArray = (await response.json()) as any[];
    // Decode each entry to a XcodeRelease
    const xcodeReleases = jsonArray.map(XcodeReleaseService.decodeXcodeRelease);
    // Cache XcodeReleases
    this.cacheXcodeReleases(xcodeReleases).then();
    // Return XcodeReleases
    return xcodeReleases;
  }

  /**
   * Decode XcodeRelease from raw Xcode Release
   * @param rawXcodeRelease The raw Xcode Release
   */
  private static decodeXcodeRelease(rawXcodeRelease: any): XcodeRelease {
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
  }
}
