import { environment, LaunchType, Toast } from "@raycast/api";
import { updateTeamTimeLabel } from "./utils";
import { showFailureToast } from "@raycast/utils";

const TeamTimeOverview = async () => {
  try {
    await updateTeamTimeLabel();
  } catch (error) {
    await showFailureToast("Failed to update team times", error as Error);
  }

  if (environment.launchType === LaunchType.UserInitiated) {
    const toast = new Toast({ style: Toast.Style.Success, title: "Refreshed Team Times" });
    await toast.show();
  }
};

export default TeamTimeOverview;
