import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { Preferences, runCommand, loadProjects } from "../utils";
import { __ } from "../i18n";

/**
 * Logic to stop SonarQube instance and Podman, including any running Gradle tasks
 */
export async function stopSonarQubeLogic() {
  const { sonarqubePodmanDir } = getPreferenceValues<Preferences>();

  if (!sonarqubePodmanDir) {
    await showToast({
      style: Toast.Style.Failure,
      title: __("common.error"),
      message: __("preferences.sonarqubePodmanDir.description"),
    });
    return;
  }

  // Load all projects and attempt to stop Gradle in each
  const projects = await loadProjects();

  if (projects.length > 0) {
    await showToast({
      style: Toast.Style.Animated,
      title: __("commands.stopSonarQube.stoppingGradle"),
      message: __("terminal.progressTracking", { status: `${projects.length} projects` }),
    });

    for (const project of projects) {
      try {
        await runCommand(
          "./gradlew --stop",
          __("terminal.commandSuccess"),
          __("terminal.commandError", { error: project.name }),
          { cwd: project.path },
        );
      } catch (error) {
        console.error(__("errors.generic", { message: `${project.name}: ${error}` }));
        // Continue with other projects even if one fails
      }
    }
  } else {
    await showToast({
      title: __("projects.management.title"),
      message: __("commands.runSonarAnalysis.noProjects"),
    });
  }

  const podmanStopCommand = "podman-compose stop && podman machine stop";

  await runCommand(
    podmanStopCommand,
    __("commands.stopSonarQube.stopSuccess"),
    __("commands.stopSonarQube.stopError"),
    { cwd: sonarqubePodmanDir },
  );
}
