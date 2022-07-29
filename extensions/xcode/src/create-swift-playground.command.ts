import { XcodeSwiftPlaygroundService } from "./services/xcode-swift-playground.service";
import { useNavigation } from "@raycast/api";
import { xcodeCreateSwiftPlaygroundForm } from "./user-interfaces/xcode-create-swift-playground/xcode-create-swift-playground-form.user-interface";

/**
 * Xcode create new Swift Playground
 */
export default () => {
  // Initialize XcodeSwiftPlaygroundService
  const xcodeSwiftPlaygroundService = new XcodeSwiftPlaygroundService();
  // Use Navigation
  const navigation = useNavigation();
  // Xcode create Swift Playground Form
  return xcodeCreateSwiftPlaygroundForm(xcodeSwiftPlaygroundService, navigation);
};
