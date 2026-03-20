import { exec } from "child_process";
import { join } from "path";
import { promisify } from "util";
import { Project, WarpTemplate } from "../types";
import { environment } from "@raycast/api";

const execAsync = promisify(exec);
const DEBUG = environment.isDevelopment;

const CMUX_SPLIT_DIRECTIONS = {
  vertical: "right",
  horizontal: "down",
} as const;

function resolveWorkingDir(project: Project, command?: WarpTemplate["commands"][number]): string {
  if (command?.workingDirectory) {
    return join(project.path, command.workingDirectory);
  }
  return project.path;
}

async function isCmuxRunning(): Promise<boolean> {
  try {
    const result = await execAsync("pgrep -x cmux");
    return result.stdout.trim().length > 0;
  } catch {
    return false;
  }
}

async function ensureCmuxRunning(): Promise<void> {
  const running = await isCmuxRunning();
  if (!running) {
    await execAsync("open -a cmux");
    // Wait for cmux to start and the CLI to become available.
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

export async function checkCmuxInstalled(): Promise<boolean> {
  try {
    await execAsync("which cmux");
    return true;
  } catch {
    try {
      await execAsync("ls /Applications/cmux.app");
      return true;
    } catch {
      return false;
    }
  }
}

export async function launchCmuxProject(project: Project, template: WarpTemplate): Promise<void> {
  try {
    if (DEBUG) {
      console.log("Launching cmux with project:", {
        project: project.name,
        template: template.name,
        commands: template.commands,
      });
    }

    await ensureCmuxRunning();

    const splitDirection = CMUX_SPLIT_DIRECTIONS[template.splitDirection ?? "vertical"];
    const firstCommand = template.commands[0];

    if (!firstCommand) {
      throw new Error("A template must include at least one command.");
    }

    const firstWorkingDir = resolveWorkingDir(project, firstCommand);

    if (template.launchMode === "multi-window") {
      for (const command of template.commands) {
        const workingDir = resolveWorkingDir(project, command);
        await execAsync(`cmux new-workspace`);
        await new Promise((resolve) => setTimeout(resolve, 300));
        await execAsync(`cmux send ${JSON.stringify(`cd ${JSON.stringify(workingDir)}`)}`);
        await execAsync(`cmux send-key Return`);
        if (command.command.trim()) {
          await execAsync(`cmux send ${JSON.stringify(command.command)}`);
          await execAsync(`cmux send-key Return`);
        }
      }
    } else if (template.launchMode === "multi-tab") {
      for (let i = 0; i < template.commands.length; i++) {
        const command = template.commands[i];
        const workingDir = resolveWorkingDir(project, command);
        if (i > 0) {
          await execAsync(`cmux new-pane`);
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
        await execAsync(`cmux send ${JSON.stringify(`cd ${JSON.stringify(workingDir)}`)}`);
        await execAsync(`cmux send-key Return`);
        if (command.command.trim()) {
          await execAsync(`cmux send ${JSON.stringify(command.command)}`);
          await execAsync(`cmux send-key Return`);
        }
      }
    } else {
      // split-panes mode
      await execAsync(`cmux send ${JSON.stringify(`cd ${JSON.stringify(firstWorkingDir)}`)}`);
      await execAsync(`cmux send-key Return`);
      if (firstCommand.command.trim()) {
        await execAsync(`cmux send ${JSON.stringify(firstCommand.command)}`);
        await execAsync(`cmux send-key Return`);
      }

      for (const command of template.commands.slice(1)) {
        const workingDir = resolveWorkingDir(project, command);
        await execAsync(`cmux new-split --direction ${splitDirection}`);
        await new Promise((resolve) => setTimeout(resolve, 300));
        await execAsync(`cmux send ${JSON.stringify(`cd ${JSON.stringify(workingDir)}`)}`);
        await execAsync(`cmux send-key Return`);
        if (command.command.trim()) {
          await execAsync(`cmux send ${JSON.stringify(command.command)}`);
          await execAsync(`cmux send-key Return`);
        }
      }
    }
  } catch (error) {
    console.error("Launch cmux failed:", error);
    throw new Error(`Failed to launch cmux: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function launchCmuxSimple(project: Project): Promise<void> {
  try {
    if (DEBUG) {
      console.log("Launching cmux simple mode:", project.name);
      console.log("Project path:", project.path);
    }

    await ensureCmuxRunning();
    await execAsync(`cmux send ${JSON.stringify(`cd ${JSON.stringify(project.path)}`)}`);
    await execAsync(`cmux send-key Return`);
  } catch (error) {
    throw new Error(`Failed to launch cmux: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function debugCmuxEnvironment(): Promise<void> {
  console.log("Starting cmux environment diagnostics...");

  try {
    const result = await execAsync("which cmux");
    console.log("cmux CLI path:", result.stdout.trim());
  } catch {
    console.log("cmux CLI not found");
  }

  try {
    await execAsync("ls -la /Applications/cmux.app");
    console.log("cmux.app installed");
  } catch {
    console.log("cmux.app not found in /Applications");
  }

  try {
    const result = await execAsync("cmux --version");
    console.log("cmux version:", result.stdout.trim());
  } catch {
    console.log("cmux --version failed");
  }

  console.log("cmux environment diagnostics complete");
}
