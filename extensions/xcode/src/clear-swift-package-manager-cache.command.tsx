import { operationWithUserFeedback } from "./shared/operation-with-user-feedback";
import { XcodeCleanupService } from "./services/xcode-cleanup.service";
import { Alert, confirmAlert, Icon } from "@raycast/api";

export default async () => {
  const alertOptions: Alert.Options = {
    icon: Icon.Trash,
    title: "Clear Swift Package Manager cache",
    message: "Are you sure you want to clear the Swift Package Manager cache?",
    primaryAction: {
      title: "Clear",
      style: Alert.ActionStyle.Destructive,
    },
  };
  if (!(await confirmAlert(alertOptions))) {
    return;
  }
  await operationWithUserFeedback(
    "Clearing Swift Package Manager cache",
    "Successfully cleared Swift Package Manager cache",
    "An error occurred while trying to clear the Swift Package Manager cache",
    XcodeCleanupService.clearSwiftPackageManagerCache
  );
};
