import { runAppleScript } from "@raycast/utils";
import { startCaffeinate } from "../utils";

type Input = {
  /**
   * Name of the application to watch (e.g., "Zoom", "Chrome", "Photoshop")
   */
  application: string;
};

/**
 * Prevents your Mac from sleeping while a specific application is running
 */
export default async function (input: Input) {
  const { application } = input;

  // Get all running processes
  const processes = await getRunningProcesses();

  // Find the process ID for the requested application
  const processId = findProcessId(processes, application);
  if (!processId) {
    throw new Error(`Application "${application}" is not currently running`);
  }

  await startCaffeinate({ menubar: true, status: true }, undefined, `-w ${processId}`);

  return `Mac will stay awake while ${application} is running`;
}

async function getRunningProcesses(): Promise<Record<string, string>> {
  const ids = (
    await runAppleScript(
      `tell application "System Events" to get the unix id of every process whose background only is false`,
    )
  ).split(", ");

  const names = (
    await runAppleScript(
      `tell application "System Events" to get the name of every process whose background only is false`,
    )
  ).split(", ");

  return names.reduce(
    (acc, name, index) => {
      acc[name.toLowerCase()] = ids[index];
      return acc;
    },
    {} as Record<string, string>,
  );
}

function findProcessId(processes: Record<string, string>, appName: string): string | undefined {
  // Try exact match first
  const exactMatch = processes[appName.toLowerCase()];
  if (exactMatch) return exactMatch;

  // Try partial match
  const key = Object.keys(processes).find(
    (name) => name.includes(appName.toLowerCase()) || appName.toLowerCase().includes(name),
  );
  return key ? processes[key] : undefined;
}
