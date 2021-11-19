import {XcodeSwiftPackageService} from "./services/xcode-swift-package.service";
import {useNavigation} from "@raycast/api";
import {xcodeAddSwiftPackageForm} from "./user-interfaces/xcode-add-swift-package/xcode-add-swift-package-form.user-interface";
import {useEffect, useState} from "react";
import {XcodeProject} from "./models/project/xcode-project.model";
import {XcodeProjectService} from "./services/xcode-project.service";

/**
 * Xcode Add Swift Package Command
 */
export default () => {
  // Initialize XcodeSwiftPackageService
  const xcodeSwiftPackageService = new XcodeSwiftPackageService();
  // Initialize XcodeProjectService
  const xcodeProjectService = new XcodeProjectService();
  // Use Navigation
  const navigation = useNavigation();
  // Use hasReadClipboard State
  const [hasReadClipboard, setHasReadClipboard] = useState<boolean>(false);
  // Use Swift Package Url State
  const [swiftPackageUrl, setSwiftPackageUrl] = useState<string>("");
  // Use XcodeProject State
  const [availableXcodeProjects, setAvailableXcodeProjects] = useState<XcodeProject[] | undefined>(undefined);
  // Use Effect
  useEffect(() => {
    // Check if clipboard has already been read
    if (!hasReadClipboard) {
      // Enable has read clipboard
      setHasReadClipboard(true);
      // Retrieve Swift Package Url from Clipboard
      xcodeSwiftPackageService
        .getSwiftPackageUrlFromClipboard()
        .then((url) => setSwiftPackageUrl(url ?? ""))
        .catch(() => setSwiftPackageUrl(""));
    }
    // Check if available Xcode Projects are not available
    if (!availableXcodeProjects) {
      // Retrieve cached XcodeProjects
      xcodeProjectService
        .cachedXcodeProjects()
        .then(cachedXcodeProjects => {
          // Check if no available XcodeProjects have been set
          if (!availableXcodeProjects) {
            // Set cached XcodeProjects
            setAvailableXcodeProjects(cachedXcodeProjects);
          }
        })
        .catch(console.error);
      // Retrieve most recent XcodeProjects
      xcodeProjectService
        .xcodeProjects()
        .then(setAvailableXcodeProjects)
        .catch(console.error);
    }
  });
  // Xcode add Swift Package Form
  return xcodeAddSwiftPackageForm(
    xcodeSwiftPackageService,
    navigation,
    availableXcodeProjects,
    swiftPackageUrl,
    setSwiftPackageUrl
  );
}
