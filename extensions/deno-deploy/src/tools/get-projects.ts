import { createWindowLessFetcher } from "@/api/deno";
import type { Project } from "@/api/types";

type Input = {
  /**
   * The ID of the organization.
   *
   * @remarks
   * Use the `get-organizations` tool to get a list of organizations. If no organization is provided, use the organization that has the name `Personal`
   */
  organizationId: string;
  /**
   * The search query to filter the projects.
   *
   * @remarks
   * If no query is provided, all projects will be returned.
   */
  query?: string;
};

const tool = async (input: Input) => {
  const fetcher = createWindowLessFetcher();
  const projects = await fetcher.requestJSON<Project[]>(
    `/organizations/${input.organizationId}/projects?q=${encodeURIComponent(input.query ?? "")}`,
  );
  return projects;
};

export default tool;
