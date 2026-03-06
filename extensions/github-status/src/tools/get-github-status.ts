import { GitHubStatus, Status, STATUS_URL } from "@/api";

/**
 * Fetches the current GitHub service status, including the overall health indicator,
 * status of individual components (Git Operations, Actions, Pages, etc.),
 * any active incidents with their updates, and upcoming scheduled maintenances.
 */
export default async function tool(): Promise<GitHubStatus> {
  const response = await fetch(STATUS_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch GitHub status: ${response.status} ${response.statusText}`);
  }
  const data = (await response.json()) as Status;

  return {
    indicator: data.status.indicator,
    description: data.status.description,
    components: data.components
      .filter((c) => c.name !== "Visit www.githubstatus.com for more information")
      .map((c) => ({ name: c.name, status: c.status })),
    incidents: data.incidents,
    scheduled_maintenances: data.scheduled_maintenances,
  };
}
