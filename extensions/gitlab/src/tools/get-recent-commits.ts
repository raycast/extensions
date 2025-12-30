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
  const pushed = events.filter((e) => e?.action_name === "pushed to" || e?.action_name === "pushed new");

  const byProject = typeof projectId === "number" ? pushed.filter((e) => e.project_id === projectId) : pushed;

  if (search && search.length > 0) {
    const q = search.toLowerCase();

    return byProject.filter((e) => {
      const title = String(e?.push_data?.commit_title || "").toLowerCase();
      const ref = String(e?.push_data?.ref || "").toLowerCase();
      const sha = String(e?.push_data?.commit_to || "").toLowerCase();
      return title.includes(q) || ref.includes(q) || sha.includes(q);
    });
  }

  return byProject;
}
