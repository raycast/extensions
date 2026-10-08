import { loadProjectSnapshots } from "../data";
import { aggregateConditions } from "../domain";
import { resolveProjectsForTool } from "../storage";
import { parseProjectRefs } from "./input-helpers";

type Input = {
  /**
   * Remote Config condition name to compare across projects.
   */
  name: string;
  /**
   * Optional saved group name used to scope the query.
   */
  groupName?: string;
  /**
   * Optional comma-separated project references. Each item can be a local id, Firebase projectId, or display name.
   */
  projectRefs?: string;
};

/**
 * Compare one Remote Config condition across selected Firebase projects.
 */
export default async function tool(input: Input): Promise<string> {
  const projects = await resolveProjectsForTool({
    groupName: input.groupName,
    projectRefs: parseProjectRefs(input.projectRefs),
  });
  const snapshots = await loadProjectSnapshots(projects);
  const row = aggregateConditions(snapshots).find(
    (entry) => entry.name === input.name,
  );

  if (!row) {
    return `Condition ${input.name} not found in the selected projects.`;
  }

  const lines = [`# Condition ${row.name}`, ""];
  lines.push(`- Found in: ${row.projectValues.length} project(s)`);
  lines.push(`- Missing in: ${row.projectsMissing.length} project(s)`);
  lines.push(
    `- Divergent expressions: ${row.divergentExpressions ? "yes" : "no"}`,
  );
  lines.push("");

  for (const projectValue of row.projectValues) {
    lines.push(
      `- ${projectValue.project.displayName} | expression=${projectValue.condition.expression} | tagColor=${projectValue.condition.tagColor || "none"} | referenced by=${projectValue.parameterReferences.join(", ") || "none"}`,
    );
  }

  if (row.projectsMissing.length > 0) {
    lines.push("");
    lines.push("## Missing In");
    for (const project of row.projectsMissing) {
      lines.push(`- ${project.displayName}`);
    }
  }

  return lines.join("\n");
}
