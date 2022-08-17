import { operationWithUserFeedback } from "./shared/operation-with-user-feedback";
import { XcodeCleanupService } from "./services/xcode-cleanup.service";

export default async () => {
  await operationWithUserFeedback(
    "Deleting unsupported simulators",
    "Successfully deleted unsupported simulators",
    "An error occurred while trying to delete unsupported simulators",
    XcodeCleanupService.deleteUnsupportedSimulators
  );
};
