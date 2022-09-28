import { operationWithUserFeedback } from "./shared/operation-with-user-feedback";
import { XcodeCleanupService } from "./services/xcode-cleanup.service";

export default async () => {
  await operationWithUserFeedback(
    "Clearing Swift Package Manager cache",
    "Successfully cleared Swift Package Manager cache",
    "An error occurred while trying to clear the Swift Package Manager cache",
    XcodeCleanupService.clearSwiftPackageManagerCache
  );
};
