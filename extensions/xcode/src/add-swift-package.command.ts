import { XcodeSwiftPackageService } from "./services/xcode-swift-package.service";
import { useNavigation } from "@raycast/api";
import { xcodeAddSwiftPackageForm } from "./user-interfaces/xcode-add-swift-package/xcode-add-swift-package-form.user-interface";
import { useEffect, useState } from "react";
import { readClipboard } from "./shared/read-clipboard";
import { XcodeSwiftPackageMetadata } from "./models/swift-package/xcode-swift-package-metadata.model";
import { XcodeService } from "./services/xcode.service";

/**
 * Xcode Add Swift Package Command
 */
export default () => {
  // Initialize XcodeSwiftPackageService
  const xcodeSwiftPackageService = new XcodeSwiftPackageService();
  // Initialize XcodeService
  const xcodeService = new XcodeService();
  // Use Navigation
  const navigation = useNavigation();
  // Use Swift Package Url State
  const [swiftPackageUrl, setSwiftPackageUrl] = useState<string>("");
  // Use Swift Package Url State
  const [swiftPackageMetadata, setSwiftPackageMetadata] = useState<XcodeSwiftPackageMetadata | undefined>(undefined);
  // Use Effect to read current Clipboard contents once
  useEffect(() => {
    // Retrieve Swift Package Url from Clipboard
    readClipboard()
      .then((contents) => {
        // Check if clipboard contents is a valid Swift Package Url
        if (xcodeSwiftPackageService.isSwiftPackageUrlValid(contents)) {
          // Return contents
          return contents;
        } else {
          // Otherwise return null
          return null;
        }
      })
      // Replace error with null
      .catch(() => null)
      .then((url) => {
        // Check if a url is available
        if (url) {
          // Set Swift Package url
          setSwiftPackageUrl(url);
        }
      });
  }, []);
  // Use effect to load Swift Package Metadata
  useEffect(() => {
    // Clear current Swift Package Metadata
    setSwiftPackageMetadata(undefined);
    // Retrieve Swift Package Metadata from Swift Package Url
    xcodeSwiftPackageService
      .getSwiftPackageMetadata(swiftPackageUrl)
      .catch(() => null)
      .then((metadata) => setSwiftPackageMetadata(metadata ?? undefined));
  }, [swiftPackageUrl]);
  // Xcode add Swift Package Form
  return xcodeAddSwiftPackageForm(
    swiftPackageUrl,
    setSwiftPackageUrl,
    swiftPackageMetadata,
    xcodeSwiftPackageService,
    xcodeService,
    navigation
  );
};
