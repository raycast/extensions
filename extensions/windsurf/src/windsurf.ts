import { execFile } from "child_process";
import { showToast, Toast } from "@raycast/api";
import { promisify } from "util";
import fs from "fs";

const execFileAsync = promisify(execFile);
const BUNDLED_WINDSURF_CLI =
  "/Applications/Windsurf.app/Contents/Resources/app/bin/windsurf";

type CommandStep = {
  command: string;
  args: string[];
  label: string;
};

async function runWithFallback(steps: CommandStep[]): Promise<void> {
  let lastError: unknown;

  for (const step of steps) {
    try {
      await execFileAsync(step.command, step.args);
      return;
    } catch (error) {
      lastError = error;
      console.log(`[Windsurf] ${step.label} failed`, error);
    }
  }

  throw lastError ?? new Error("All fallback commands failed");
}

function getCliCandidates(): string[] {
  const candidates = ["windsurf"];
  if (fs.existsSync(BUNDLED_WINDSURF_CLI)) {
    candidates.push(BUNDLED_WINDSURF_CLI);
  }
  return candidates;
}

/**
 * Opens a project in Windsurf
 * When openInNewWindow is true, force a new window if possible.
 */
export async function openProjectInWindsurf(
  projectPath: string,
  openInNewWindow = false
): Promise<void> {
  const url = new URL(`windsurf://file/${encodeURIComponent(projectPath)}`);
  if (openInNewWindow) {
    url.searchParams.set("windowId", "_blank");
  }

  const cliCandidates = getCliCandidates();
  const cliSteps: CommandStep[] = openInNewWindow
    ? cliCandidates.flatMap((cli) => [
        { command: cli, args: ["-n", projectPath], label: `${cli} -n <path>` },
        {
          command: cli,
          args: ["--new-window", projectPath],
          label: `${cli} --new-window <path>`,
        },
      ])
    : cliCandidates.map((cli) => ({
        command: cli,
        args: [projectPath],
        label: `${cli} <path>`,
      }));

  const openSteps: CommandStep[] = openInNewWindow
    ? [
        {
          command: "open",
          args: ["-na", "Windsurf", "--args", "-n", projectPath],
          label: "open -na Windsurf --args -n <path>",
        },
      ]
    : [
        {
          command: "open",
          args: ["-a", "Windsurf", projectPath],
          label: "open -a Windsurf <path>",
        },
      ];

  try {
    await runWithFallback([
      { command: "open", args: [url.toString()], label: "open URL scheme" },
      ...cliSteps,
      ...openSteps,
    ]);
  } catch (error) {
    console.error("Error opening project in Windsurf:", error);
    await showToast(
      Toast.Style.Failure,
      "Failed to open project in Windsurf",
      error instanceof Error ? error.message : "Unknown error"
    );
    throw error;
  }
}

/**
 * Opens a new Windsurf window
 */
export async function openNewWindsurfWindow(): Promise<void> {
  const cliCandidates = getCliCandidates();

  try {
    await runWithFallback([
      {
        command: "open",
        args: ["-na", "Windsurf", "--args", "-n"],
        label: "open -na Windsurf --args -n",
      },
      ...cliCandidates.flatMap((cli) => [
        { command: cli, args: ["-n"], label: `${cli} -n` },
        { command: cli, args: ["--new-window"], label: `${cli} --new-window` },
      ]),
    ]);
  } catch (error) {
    console.error("Error opening new Windsurf window:", error);
    await showToast(
      Toast.Style.Failure,
      "Failed to open new Windsurf window",
      error instanceof Error ? error.message : "Make sure Windsurf is installed"
    );
    throw error;
  }
}
