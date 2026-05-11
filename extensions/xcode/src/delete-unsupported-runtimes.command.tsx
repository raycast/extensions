import { operationWithUserFeedback } from "./shared/operation-with-user-feedback";
import { Alert, confirmAlert, Icon } from "@raycast/api";
import { XcodeRuntimeService } from "./services/xcode-runtime.service";

export default async () => {
  const alertOptions: Alert.Options = {
    icon: Icon.Trash,
    title: "Delete unsupported runtimes",
    message: "Are you sure you want to delete all unsupported runtimes?",
    primaryAction: {
      title: "Delete",
      style: Alert.ActionStyle.Destructive,
    },
  };
  if (!(await confirmAlert(alertOptions))) {
    return;
  }
  await operationWithUserFeedback(
    "Deleting unsupported runtimes",
    "Successfully deleted unsupported runtimes",
    "An error occurred while trying to delete unsupported runtimes",
    XcodeRuntimeService.deleteUnsupportedXcodeRuntimes
  );
};
