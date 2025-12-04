import { XcodeSimulatorService } from "./services/xcode-simulator.service";
import { closeMainWindow, launchCommand, LaunchProps, LaunchType, showToast, Toast } from "@raycast/api";
import {
  XcodeSimulatorOpenUrlError,
  XcodeSimulatorOpenUrlErrorReason,
} from "./models/xcode-simulator/xcode-simulator-open-url-error.model";

export default async (props: LaunchProps<{ arguments: { url: string } }>) => {
  // Show loading toast
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Opening URL in Simulator",
  });
  try {
    // Try to open url
    await XcodeSimulatorService.openUrl(props.arguments.url);
    // Close main window
    await closeMainWindow();
  } catch (error) {
    // Check if error is an instance of XcodeSimulatorOpenUrlError
    if (error instanceof XcodeSimulatorOpenUrlError) {
      // Switch on reason
      switch (error.reason) {
        case XcodeSimulatorOpenUrlErrorReason.badUrl:
          // Show failure toast
          toast.style = Toast.Style.Failure;
          toast.title = "Please enter a valid url";
          break;
        case XcodeSimulatorOpenUrlErrorReason.bootedSimulatorMissing:
          toast.style = Toast.Style.Failure;
          toast.title = "No simulator is booted, please boot a simulator to open a url.";
          toast.primaryAction = {
            title: "Manage Simulators",
            onAction: async (toast) => {
              await launchCommand({ name: "manage-simulators.command", type: LaunchType.UserInitiated });
              await toast.hide();
            },
          };
          break;
        case XcodeSimulatorOpenUrlErrorReason.xcodeInstallationMissing:
          // Hide toast
          await toast.hide();
          // Launch manage simulators command.
          // As the command is wrapped inside a `XcodeInstallationVerifier` component
          // the user will be informed that an installation of Xcode is required
          await launchCommand({ name: "manage-simulators.command", type: LaunchType.UserInitiated });
          break;
      }
    } else {
      // Show failure toast
      toast.style = Toast.Style.Failure;
      toast.title = "An error occurred while trying to open the url";
      toast.message = `${error}`;
    }
  }
};
