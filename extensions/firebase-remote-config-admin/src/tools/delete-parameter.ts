import {
  prepareBulkOperation,
  publishPreparedBulkOperation,
} from "../bulk-engine";
import { resolveProjectsForTool } from "../storage";
import { hasProjectScopeFilter, parseProjectRefs } from "./input-helpers";
import { formatPublishResults } from "./write-helpers";

type Input = {
  /**
   * The exact Remote Config parameter key to delete.
   */
  key: string;
  /**
   * Optional saved group name used to scope the operation.
   */
  groupName?: string;
  /**
   * Optional comma-separated project references. Each item can be a local id, Firebase projectId, or display name.
   */
  projectRefs?: string;
};

/**
 * Delete a Remote Config parameter across selected Firebase projects. Requires user confirmation before publishing.
 */
export default async function tool(input: Input): Promise<string> {
  const projectRefs = parseProjectRefs(input.projectRefs);
  const projects = await resolveProjectsForTool({
    groupName: input.groupName,
    projectRefs,
  });

  if (projects.length === 0) {
    if (hasProjectScopeFilter({ groupName: input.groupName, projectRefs })) {
      return "No projects matched the provided scope. Check the group name or project references and try again.";
    }
    return "No enabled projects found. Add and enable Firebase projects in 'Manage Projects' first.";
  }

  const prepared = await prepareBulkOperation(projects, {
    type: "delete-parameter",
    key: input.key,
  });

  const published = await publishPreparedBulkOperation(prepared);
  return formatPublishResults(prepared, published);
}
