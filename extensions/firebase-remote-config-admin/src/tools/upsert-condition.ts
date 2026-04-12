import {
  prepareBulkOperation,
  publishPreparedBulkOperation,
} from "../bulk-engine";
import { resolveProjectsForTool } from "../storage";
import { formatPublishResults } from "./write-helpers";

type Input = {
  /**
   * The Remote Config condition name to create or update.
   */
  name: string;
  /**
   * The condition expression (e.g. "device.os == 'ios'").
   */
  expression: string;
  /**
   * Optional tag color for the condition (e.g. "BLUE", "GREEN", "RED").
   */
  tagColor?: string;
  /**
   * Optional saved group name used to scope the operation.
   */
  groupName?: string;
  /**
   * Optional list of project references. Each item can be a local id, Firebase projectId, or display name.
   */
  projectRefs?: string[];
};

/**
 * Create or update a Remote Config condition across selected Firebase projects. Requires user confirmation before publishing.
 */
export default async function tool(input: Input): Promise<string> {
  const projects = await resolveProjectsForTool({
    groupName: input.groupName,
    projectRefs: input.projectRefs,
  });

  if (projects.length === 0) {
    return "No enabled projects found. Add and enable Firebase projects in 'Manage Projects' first.";
  }

  const prepared = await prepareBulkOperation(projects, {
    type: "upsert-condition",
    name: input.name,
    expression: input.expression,
    tagColor: input.tagColor,
  });

  const published = await publishPreparedBulkOperation(prepared);
  return formatPublishResults(prepared, published);
}
