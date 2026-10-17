import { requirePlaneClient } from "../api/auth";
import { resolveProject } from "../api/ai";
import { searchWorkItems } from "../api/work-items";
import { getWorkItemUrlWithIdentifier } from "../helpers/work-items";
import { withPlane } from "../helpers/with-plane";

type Input = {
  /** Text to search for. Plane matches work item titles, sequence numbers, and project identifiers (e.g. "login bug", "ENG-12"). */
  query: string;
  /** Optional project identifier (e.g. ENG), name, or id to limit the search to. */
  project?: string;
  /** Maximum number of results (default 25, max 100). */
  limit?: number;
};

export default withPlane(async (input: Input) => {
  const client = requirePlaneClient();
  const project = input.project ? await resolveProject(input.project) : undefined;
  const results = await searchWorkItems({
    searchText: input.query,
    projectId: project?.id,
    limit: Math.min(Math.max(input.limit ?? 25, 1), 100),
  });
  return results.map((item) => {
    const identifier = `${item.projectIdentifier}-${item.sequenceId}`;
    return {
      id: item.id,
      identifier,
      name: item.name,
      project: item.projectIdentifier,
      url: getWorkItemUrlWithIdentifier(client.workspaceSlug, identifier),
    };
  });
});
