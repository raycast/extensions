import { getRunningApps, startCaffeinate } from "../utils";

type Input = {
  /**
   * Name of the application to watch (e.g., "Notepad", "Chrome", "Photoshop")
   */
  application: string;
};

/**
 * Prevents your PC from sleeping while a specific application is running
 */
export default async function (input: Input) {
  const { application } = input;

  const apps = await getRunningApps();
  const pid = findProcessId(apps, application);
  if (!pid) {
    throw new Error(`Application "${application}" is not currently running`);
  }

  await startCaffeinate({ status: true }, undefined, { watchPid: pid });

  return `PC will stay awake while ${application} is running`;
}

function findProcessId(apps: { name: string; pid: number }[], appName: string): number | undefined {
  const lowerAppName = appName.toLowerCase();

  const exactMatch = apps.find((app) => app.name.toLowerCase() === lowerAppName);
  if (exactMatch) return exactMatch.pid;

  const partialMatch = apps.find(
    (app) => app.name.toLowerCase().includes(lowerAppName) || lowerAppName.includes(app.name.toLowerCase()),
  );
  return partialMatch?.pid;
}
