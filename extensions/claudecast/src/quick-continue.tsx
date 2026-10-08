import { showToast, Toast, showHUD } from "@raycast/api";
import { existsSync } from "fs";
import { getMostRecentProject } from "./lib/project-discovery";
import { getMostRecentSession } from "./lib/session-parser";
import { launchClaudeCode } from "./lib/terminal";
import { ensureClaudeInstalled } from "./lib/claude-cli";
import { launchStoredSession } from "./lib/session-launch";

export default async function QuickContinue() {
  try {
    // First try to get the most recent session
    const recentSession = await getMostRecentSession();

    if (recentSession && existsSync(recentSession.projectPath)) {
      await showHUD(`Continuing Session in ${recentSession.projectName}...`);
      await launchStoredSession(recentSession, {
        continueLast: true,
      });
      return;
    }

    // Fall back to most recent project (no session to restore settings from)
    const recentProject = await getMostRecentProject();

    if (recentProject && existsSync(recentProject.path)) {
      if (!(await ensureClaudeInstalled())) return;
      await showHUD(`Starting New Session in ${recentProject.name}...`);
      await launchClaudeCode({
        projectPath: recentProject.path,
      });
      return;
    }

    // No projects found
    await showToast({
      style: Toast.Style.Failure,
      title: "No Recent Sessions",
      message: "Run Claude Code in a Project First to Enable Quick Continue",
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
