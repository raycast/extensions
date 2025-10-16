import { operationWithUserFeedback } from "./shared/operation-with-user-feedback";
import { XcodeCleanupService } from "./services/xcode-cleanup.service";
import { Alert, confirmAlert, Icon } from "@raycast/api";

export default async () => {
  const alertOptions: Alert.Options = {
    icon: Icon.Trash,
    title: "Delete unsupported simulators",
    message: "Are you sure you want to delete all unsupported simulators?",
    primaryAction: {
      title: "Delete",
      style: Alert.ActionStyle.Destructive,
    },
  };
  if (!(await confirmAlert(alertOptions))) {
    return;
  }
  await operationWithUserFeedback(
    "Deleting unsupported simulators",
    "Successfully deleted unsupported simulators",
    "An error occurred while trying to delete unsupported simulators",
    XcodeCleanupService.deleteUnsupportedSimulators
  );
};
