import { operationWithUserFeedback } from "./shared/operation-with-user-feedback";
import { XcodeCleanupService } from "./services/xcode-cleanup.service";
import { Alert, confirmAlert, Icon } from "@raycast/api";

export default async () => {
  const alertOptions: Alert.Options = {
    icon: Icon.Trash,
    title: "Clear derived data",
    message: "Are you sure you want to clear the derived data directory?",
    primaryAction: {
      title: "Clear",
      style: Alert.ActionStyle.Destructive,
    },
  };
  if (!(await confirmAlert(alertOptions))) {
    return;
  }
  await operationWithUserFeedback(
    "Clearing derived data",
    "Successfully cleared derived data",
    "An error occurred while trying to clear the derived data directory",
    XcodeCleanupService.clearDerivedData
  );
};
