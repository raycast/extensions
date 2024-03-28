import { operationWithUserFeedback } from "./shared/operation-with-user-feedback";
import { XcodeCleanupService } from "./services/xcode-cleanup.service";
import { Alert, confirmAlert, Icon } from "@raycast/api";
import ActionStyle = Alert.ActionStyle;

export default async () => {
  const alertOptions: Alert.Options = {
    icon: Icon.Trash,
    title: "Clear SwiftUI Previews cache",
    message: "Are you sure you want to clear the SwiftUI Previews cache?",
    primaryAction: {
      title: "Clear",
      style: ActionStyle.Destructive,
    },
  };
  if (!(await confirmAlert(alertOptions))) {
    return;
  }
  await operationWithUserFeedback(
    "Clearing SwiftUI Previews cache",
    "Successfully cleared SwiftUI Previews cache",
    "An error occurred while trying to clear the SwiftUI Previews cache",
    XcodeCleanupService.clearSwiftUIPreviewsCache
  );
};
