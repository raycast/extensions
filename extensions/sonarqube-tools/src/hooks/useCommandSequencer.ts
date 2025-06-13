import { showToast, Toast, getPreferenceValues } from "@raycast/api";
import { isSonarQubeRunning, runInNewTerminal, Preferences, execAsync } from "../utils";
import { __ } from "../i18n";

const PODMAN_PATH = "/opt/podman/bin/podman";
const PODMAN_COMPOSE_PATH = "/opt/homebrew/bin/podman-compose";
const DEFAULT_SONARQUBE_PORT = "9000";

/**
 * Custom hook to handle the command sequence execution
 * Extracts the complex command logic from the main component
 */
export function useCommandSequencer() {
  const preferences = getPreferenceValues<Preferences>();

  /**
   * Execute the sequence of commands for starting SonarQube and running analysis
   */
  const performStartAnalyzeSequence = async (projectPath: string, projectName: string) => {
    // Get detailed status information about SonarQube server
    await showToast({
      style: Toast.Style.Animated,
      title: __("commands.startSonarQube.statusChecking"),
    });

    const status = (await isSonarQubeRunning({ detailed: true, retries: 1 })) as {
      running: boolean;
      status: string;
      details?: string;
    };
    let commandsToExecute: string[];

    if (status.running) {
      // SonarQube is fully running
      await showToast({
        style: Toast.Style.Success,
        title: __("commands.startSonarQube.alreadyRunning"),
        message: status.details || __("commands.runSonarAnalysis.runningAnalysis"),
      });
      commandsToExecute = [
        `cd "${projectPath}"`,
        `echo "--- ${__("commands.runSonarAnalysis.runningAnalysis")} (${__("commands.startSonarQube.alreadyRunning")}) ---"`,
        `./gradlew clean test jacocoTestReport detekt sonar`,
        `echo "--- ${__("commands.runSonarAnalysis.analysisSuccess")} ---"`,
        `echo "--- ${__("terminal.completed")} ---"`,
      ];
    } else if (status.status === "starting") {
      // SonarQube is starting up but not ready yet
      await showToast({
        style: Toast.Style.Animated,
        title: __("commands.startSonarQube.starting"),
        message: __("commands.startSonarQube.pleaseWait"),
      });
      // Add a longer wait time since we know it's already starting
      commandsToExecute = [
        `echo "--- ${__("commands.startSonarQube.waiting")} (60s) ---"`,
        `sleep 60`, // Longer wait since it's already in the process of starting
        `cd "${projectPath}"`,
        `echo "--- ${__("commands.runSonarAnalysis.runningAnalysis")} ---"`,
        `./gradlew clean test jacocoTestReport detekt sonar`,
        `echo "--- ${__("commands.runSonarAnalysis.analysisSuccess")} ---"`,
        `echo "--- ${__("terminal.completed")} ---"`,
      ];
    } else if (status.status === "timeout") {
      // SonarQube might be initializing - do another check with longer timeout
      await showToast({
        style: Toast.Style.Animated,
        title: __("commands.startSonarQube.starting"),
        message: __("commands.startSonarQube.checkingStatus"),
      });

      // Do another check with longer timeout to be certain
      const extendedStatus = (await isSonarQubeRunning({ detailed: true, retries: 2, timeout: 5000 })) as {
        running: boolean;
        status: string;
      };

      if (extendedStatus.running) {
        // It is running, just took longer to detect
        await showToast({
          style: Toast.Style.Success,
          title: __("commands.startSonarQube.alreadyRunning"),
          message: __("commands.runSonarAnalysis.runningAnalysis"),
        });
        commandsToExecute = [
          `cd "${projectPath}"`,
          `echo "--- ${__("commands.runSonarAnalysis.runningAnalysis")} ---"`,
          `./gradlew clean test jacocoTestReport detekt sonar`,
          `echo "--- ${__("commands.runSonarAnalysis.analysisSuccess")} ---"`,
          `echo "--- ${__("terminal.completed")} ---"`,
        ];
      } else {
        // It's definitely not running, so start from scratch
        await showToast({
          style: Toast.Style.Animated,
          title: __("commands.startSonarQube.title"),
          message: __("commands.startSonarQube.starting"),
        });
        // First start SonarQube and wait for it to be fully running before continuing
        try {
          // Start SonarQube using podman
          await execAsync(
            `cd "${preferences.sonarqubePodmanDir}" && ${PODMAN_PATH} machine start && ${PODMAN_COMPOSE_PATH} start`,
          );

          // Show progress toast
          await showToast({
            style: Toast.Style.Animated,
            title: __("commands.startSonarQube.waiting"),
            message: __("commands.startSonarQube.pleaseWait"),
          });

          // Poll for SonarQube readiness - retry multiple times with increasing timeout
          let isReady = false;
          const maxRetries = 10;
          for (let retry = 0; retry < maxRetries && !isReady; retry++) {
            // Wait longer between each check (starts at 5s and increases)
            const waitTime = 5000 + retry * 2000;
            await new Promise((resolve) => setTimeout(resolve, waitTime));

            const checkStatus = (await isSonarQubeRunning({ detailed: true, retries: 2 })) as { running: boolean };
            isReady = checkStatus.running;

            if (isReady) {
              await showToast({
                style: Toast.Style.Success,
                title: __("commands.startSonarQube.success"),
              });
            } else if (retry === maxRetries - 1) {
              // Last attempt, but still not ready - warn user but continue anyway
              await showToast({
                style: Toast.Style.Failure, // Only Success, Failure, Animated are supported
                title: __("commands.startSonarQube.statusUnknown"),
                message: __("commands.startSonarQube.initializingContinue"),
              });
            }
          }
        } catch (error) {
          // If starting SonarQube fails, show error but continue with analysis anyway
          await showToast({
            style: Toast.Style.Failure,
            title: __("commands.startSonarQube.startError"),
            message: String(error),
          });
        }

        // After SonarQube is started (or at least attempted), run the analysis
        const port = preferences.sonarqubePort?.trim() || DEFAULT_SONARQUBE_PORT;
        commandsToExecute = [
          `echo "--- ${__("commands.startSonarQube.success")}. ${__("commands.startSonarQube.accessUrl")} http://localhost:${port} ---"`,
          `cd "${projectPath}"`,
          `echo "--- ${__("commands.runSonarAnalysis.runningAnalysis")} ${projectName} ---"`,
          `./gradlew clean test jacocoTestReport detekt sonar`,
          `echo "--- ${__("commands.runSonarAnalysis.analysisSuccess")} ---"`,
          `echo "--- ${__("terminal.completed")} ---"`,
        ];
      }
    } else {
      // SonarQube is not running - start from scratch
      await showToast({
        style: Toast.Style.Animated,
        title: __("commands.startSonarQube.title"),
        message: __("commands.startSonarQube.starting"),
      });

      // First start SonarQube and wait for it to be fully running before continuing
      try {
        // Start SonarQube using podman
        await execAsync(
          `cd "${preferences.sonarqubePodmanDir}" && ${PODMAN_PATH} machine start && ${PODMAN_COMPOSE_PATH} start`,
        );

        // Show progress toast
        await showToast({
          style: Toast.Style.Animated,
          title: __("commands.startSonarQube.waiting"),
          message: __("commands.startSonarQube.pleaseWait"),
        });

        // Poll for SonarQube readiness - retry multiple times with increasing timeout
        let isReady = false;
        const maxRetries = 10;
        for (let retry = 0; retry < maxRetries && !isReady; retry++) {
          // Wait longer between each check (starts at 5s and increases)
          const waitTime = 5000 + retry * 2000;
          await new Promise((resolve) => setTimeout(resolve, waitTime));

          const checkStatus = (await isSonarQubeRunning({ detailed: true, retries: 2 })) as { running: boolean };
          isReady = checkStatus.running;

          if (isReady) {
            await showToast({
              style: Toast.Style.Success,
              title: __("commands.startSonarQube.success"),
            });
          } else if (retry === maxRetries - 1) {
            // Last attempt, but still not ready - warn user but continue anyway
            await showToast({
              style: Toast.Style.Failure, // Only Success, Failure, Animated are supported
              title: __("commands.startSonarQube.statusUnknown"),
              message: __("commands.startSonarQube.initializingContinue"),
            });
          }
        }
      } catch (error) {
        // If starting SonarQube fails, show error but continue with analysis anyway
        await showToast({
          style: Toast.Style.Failure,
          title: __("commands.startSonarQube.startError"),
          message: String(error),
        });
      }

      // After SonarQube is started (or at least attempted), run the analysis
      const port = preferences.sonarqubePort?.trim() || DEFAULT_SONARQUBE_PORT;
      commandsToExecute = [
        `echo "--- ${__("commands.startSonarQube.success")}. ${__("commands.startSonarQube.accessUrl")} http://localhost:${port} ---"`,
        `cd "${projectPath}"`,
        `echo "--- ${__("commands.runSonarAnalysis.runningAnalysis")} ${projectName} ---"`,
        `./gradlew clean test jacocoTestReport detekt sonar`,
        `echo "--- ${__("commands.runSonarAnalysis.analysisSuccess")} ---"`,
        `echo "--- ${__("terminal.completed")} ---"`,
      ];
    }

    await runInNewTerminal(
      commandsToExecute,
      __("commands.allInOne.success", { projectName }),
      __("commands.allInOne.error"),
      { trackProgress: true },
    );
  };

  return { performStartAnalyzeSequence };
}
