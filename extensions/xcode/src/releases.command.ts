import { XcodeReleaseService } from "./services/xcode-release.service";
import { useEffect, useState } from "react";
import { XcodeRelease } from "./models/release/xcode-release.model";
import { xcodeReleaseList } from "./user-interfaces/xcode-releases/xcode-release-list.user-interface";
import { showToast, ToastStyle } from "@raycast/api";

/**
 * Xcode releases command
 */
export default () => {
  // Initialize XcodeReleaseService
  const xcodeReleaseService = new XcodeReleaseService();
  // Use XcodeRelease State
  const [xcodeReleases, setXcodeReleases] = useState<XcodeRelease[] | undefined>(undefined);
  // Use Effect
  useEffect(() => {
    xcodeReleaseService
      .cachedXcodeReleases()
      .then((cachedXcodeReleases) => {
        // Check if no XcodeReleases have been set
        if (!xcodeReleases) {
          // Set cached XcodeReleases
          setXcodeReleases(cachedXcodeReleases);
        }
      })
      .catch(console.error);
    // Retrieve latest XcodeReleases
    xcodeReleaseService
      .xcodeReleases()
      .then(setXcodeReleases)
      .catch((error) => {
        // Check if no XcodeReleases have been set
        if (!xcodeReleases) {
          // Set empty XcodeReleases
          setXcodeReleases([]);
        }
        // Log Error
        console.error(error);
        // Show Toast
        return showToast(ToastStyle.Failure, "An error occurred while fetching Xcode Releases", error);
      });
  }, []);
  // Return XcodeRelease List
  return xcodeReleaseList(xcodeReleases);
};
