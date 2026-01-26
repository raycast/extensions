import { showToast, Toast, showHUD } from "@raycast/api";
import { getMostRecentProject } from "./lib/project-discovery";
import { getMostRecentSession } from "./lib/session-parser";
import { launchClaudeCode } from "./lib/terminal";

export default async function QuickContinue() {
  try {
    // First try to get the most recent session
    const recentSession = await getMostRecentSession();

    if (recentSession) {
      await showHUD(`Continuing session in ${recentSession.projectName}...`);
      await launchClaudeCode({
        projectPath: recentSession.projectPath,
        continueSession: true,
      });
      return;
    }

    // Fall back to most recent project
    const recentProject = await getMostRecentProject();

    if (recentProject) {
      await showHUD(`Starting new session in ${recentProject.name}...`);
      await launchClaudeCode({
        projectPath: recentProject.path,
      });
      return;
    }

    // No projects found
    await showToast({
      style: Toast.Style.Failure,
      title: "No Recent Sessions",
      message: "Run Claude Code in a project first to enable quick continue",
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
