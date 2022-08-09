import { operationWithUserFeedback } from "./shared/operation-with-user-feedback";
import { XcodeCleanupService } from "./services/xcode-cleanup.service";

export default async () => {
  await operationWithUserFeedback(
    "Clearing derived data",
    "Successfully cleared derived data",
    "An error occurred while trying to clear the derived data directory",
    XcodeCleanupService.clearDerivedData
  );
};
