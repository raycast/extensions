import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { Preferences, runCommand, isSonarQubeRunning } from "../utils";
import { __ } from "../i18n";

/**
 * Logic to start the SonarQube instance using Podman
 */
export async function startSonarQubeLogic() {
  const preferences = getPreferenceValues<Preferences>();
  const sonarqubePodmanDir = preferences.sonarqubePodmanDir;

  if (!sonarqubePodmanDir) {
    await showToast({
      style: Toast.Style.Failure,
      title: __("common.error"),
      message: __("preferences.sonarqubePodmanDir.description"),
    });
    return;
  }

  // Get detailed status information about SonarQube server
  const status = (await isSonarQubeRunning({ detailed: true, retries: 1 })) as {
    running: boolean;
    status: string;
    details?: string;
  };

  if (status.running) {
    await showToast({
      style: Toast.Style.Success,
      title: __("commands.startSonarQube.alreadyRunning"),
      message: status.details,
    });
    return;
  }

  // Check if SonarQube is in starting state, which means we should wait rather than try to start again
  if (status.status === "starting") {
    await showToast({
      style: Toast.Style.Animated,
      title: __("commands.startSonarQube.starting"),
      message: __("commands.startSonarQube.pleaseWait"),
    });
    return;
  }

  // If it's a timeout but not a clear "down" status, it could be still initializing
  if (status.status === "timeout") {
    await showToast({
      style: Toast.Style.Animated,
      title: __("commands.startSonarQube.starting"),
      message: __("commands.startSonarQube.checkingStatus"),
    });

    // Do another check with longer timeout to be certain
    const secondCheck = (await isSonarQubeRunning({ detailed: true, timeout: 5000 })) as {
      running: boolean;
      status: string;
      details?: string;
    };

    if (secondCheck.running || secondCheck.status === "starting") {
      await showToast({
        style: Toast.Style.Success,
        title: secondCheck.running
          ? __("commands.startSonarQube.alreadyRunning")
          : __("commands.startSonarQube.starting"),
        message: secondCheck.details,
      });
      return;
    }
  }

  const command = "podman machine start && podman-compose start";

  await runCommand(command, __("commands.startSonarQube.startSuccess"), __("commands.startSonarQube.startError"), {
    cwd: sonarqubePodmanDir,
  });
}
