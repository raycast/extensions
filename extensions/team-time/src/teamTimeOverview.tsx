import { environment, LaunchType, Toast } from "@raycast/api";
import { updateTeamTimeLabel } from "./utils";

const TeamTimeOverview = async () => {
  await updateTeamTimeLabel();

  if (environment.launchType === LaunchType.UserInitiated) {
    // Show toast if the user runs it manually
    const toast = new Toast({
      style: Toast.Style.Success,
      title: "Refreshed Team Times",
    });
    toast.primaryAction = {
      title: "Copy to Clipboard",
      onAction: () => {
        return;
      },
    };
    await toast.show();
  }
};

export default TeamTimeOverview;
