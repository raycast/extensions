import { loadSnapshot } from "../appfreezer";
import { AppFreezerApplication } from "../protocol";

type Input = {
  /**
   * Only return applications matching this status. Omit to return every known application.
   */
  status?: "running" | "paused";
};

type ApplicationSummary = {
  name: string;
  status: AppFreezerApplication["status"];
  cpuPercent: number;
  memoryPercent: number;
};

/**
 * List the applications App Freezer currently knows about, with their paused/running status and live CPU and memory usage. Read-only: never pauses, resumes, or quits anything.
 */
export default async function listApplications(input: Input): Promise<{
  generatedAt: string;
  count: number;
  applications: ApplicationSummary[];
}> {
  const snapshot = await loadSnapshot();
  const applications = snapshot.applications
    .filter((application) => !input.status || application.status === input.status)
    .map((application) => ({
      name: application.name,
      status: application.status,
      cpuPercent: application.cpuPercent,
      memoryPercent: application.memoryPercent,
    }));

  return {
    generatedAt: snapshot.generatedAt,
    count: applications.length,
    applications,
  };
}
