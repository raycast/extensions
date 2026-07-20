import { gitlab } from "../common";

export type Input = {
  /**
   * If provided, filters events by the specific project
   */
  projectId?: number;
  /**
   * Client-side filter by commit title or ref
   */
  search?: string;
};

type PushEvent = {
  action_name?: string;
  project_id?: number;
  push_data?: {
    commit_title?: string;
    ref?: string;
    commit_to?: string;
  };
};

/**
 * Get user's recent commits
 */
export default async function ({ projectId, search }: Input) {
  const events = (await gitlab.fetch("events", { action: "pushed" })) as PushEvent[];
  const pushed = events.filter((event) => event?.action_name === "pushed to" || event?.action_name === "pushed new");

  const byProject = typeof projectId === "number" ? pushed.filter((event) => event.project_id === projectId) : pushed;

  if (search && search.length > 0) {
    const searchLower = search.toLowerCase();

    return byProject.filter((event) => {
      const title = String(event?.push_data?.commit_title || "").toLowerCase();
      const ref = String(event?.push_data?.ref || "").toLowerCase();
      const sha = String(event?.push_data?.commit_to || "").toLowerCase();
      return title.includes(searchLower) || ref.includes(searchLower) || sha.includes(searchLower);
    });
  }

  return byProject;
}
