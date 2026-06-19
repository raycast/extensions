import { environment } from "@raycast/api";
import { execFile } from "child_process";
import { promisify } from "util";
import { Project, WarpTemplate } from "../types";

const execFileAsync = promisify(execFile);
const DEBUG = environment.isDevelopment;

export async function launchScriptProject(project: Project, template: WarpTemplate): Promise<void> {
  const script = template.scriptContent?.trim();

  if (!script) {
    throw new Error("This script template is empty.");
  }

  if (DEBUG) {
    console.log("Launching script template:", {
      project: project.name,
      template: template.name,
      cwd: project.path,
    });
  }

  try {
    await execFileAsync("bash", ["-c", script, "--", project.path], {
      cwd: project.path,
      env: {
        ...process.env,
        CODE_RUNWAY_PROJECT_NAME: project.name,
        CODE_RUNWAY_PROJECT_PATH: project.path,
      },
    });
  } catch (error) {
    throw new Error(`Failed to launch script: ${error instanceof Error ? error.message : String(error)}`);
  }
}
