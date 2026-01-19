import { Action, Tool } from "@raycast/api";
import { XcodeCleanupService } from "../services/xcode-cleanup.service";

export const confirmation: Tool.Confirmation<never> = async () => {
  return {
    style: Action.Style.Destructive,
    message: "Are you sure you want to clear the Swift Package Manager cache?",
  };
};

/**
 * Clears the Swift Package Manager cache directory.
 */
export default () => XcodeCleanupService.clearSwiftPackageManagerCache();
