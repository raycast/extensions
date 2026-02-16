import { showToast, Toast, showHUD } from "@raycast/api";
import { existsSync } from "fs";
import { getMostRecentProject } from "./lib/project-discovery";
import { getMostRecentSession } from "./lib/session-parser";
import { launchClaudeCode } from "./lib/terminal";
import { ensureClaudeInstalled } from "./lib/claude-cli";

export default async function QuickContinue() {
  try {
    // Check if Claude is installed first
    if (!(await ensureClaudeInstalled())) return;

    // First try to get the most recent session
    const recentSession = await getMostRecentSession();

    if (recentSession && existsSync(recentSession.projectPath)) {
      await showHUD(`Continuing session in ${recentSession.projectName}...`);
      await launchClaudeCode({
        projectPath: recentSession.projectPath,
        continueSession: true,
      });
      return;
    }

    // Fall back to most recent project
    const recentProject = await getMostRecentProject();

    if (recentProject && existsSync(recentProject.path)) {
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
