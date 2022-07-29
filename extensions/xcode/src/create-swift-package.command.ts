import { xcodeCreateSwiftPackageForm } from "./user-interfaces/xcode-create-swift-package/xcode-create-swift-package-form.user-interface";
import { XcodeSwiftPackageService } from "./services/xcode-swift-package.service";
import { useNavigation } from "@raycast/api";

/**
 * Xcode create swift package command
 */
export default () => {
  // Initialize XcodeSwiftPackageService
  const xcodeSwiftPackageService = new XcodeSwiftPackageService();
  // Use Navigation
  const navigation = useNavigation();
  // Xcode create Swift Package Form
  return xcodeCreateSwiftPackageForm(xcodeSwiftPackageService, navigation);
};
