import { loadProjectSnapshots } from "../data";
import { aggregateParameters, formatParsedValue } from "../domain";
import { resolveProjectsForTool } from "../storage";
import { parseProjectRefs } from "./input-helpers";

type Input = {
  /**
   * Remote Config parameter key to compare across projects.
   */
  key: string;
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
 * Compare one Remote Config parameter across selected Firebase projects.
 */
export default async function tool(input: Input): Promise<string> {
  const projects = await resolveProjectsForTool({
    groupName: input.groupName,
    projectRefs: parseProjectRefs(input.projectRefs),
  });
  const snapshots = await loadProjectSnapshots(projects);
  const row = aggregateParameters(snapshots).find(
    (entry) => entry.key === input.key,
  );

  if (!row) {
    return `Parameter ${input.key} not found in the selected projects.`;
  }

  const lines = [`# Parameter ${row.key}`, ""];
  lines.push(`- Found in: ${row.projectValues.length} project(s)`);
  lines.push(`- Missing in: ${row.projectsMissing.length} project(s)`);
  lines.push(`- Divergent defaults: ${row.divergentDefaults ? "yes" : "no"}`);
  lines.push(
    `- Firebase value types: ${row.firebaseValueTypes.join(", ") || "unknown"}`,
  );
  lines.push("");

  for (const projectValue of row.projectValues) {
    const overrides =
      projectValue.conditionalValues.length > 0
        ? projectValue.conditionalValues
            .map(
              (entry) =>
                `${entry.conditionName}=${formatParsedValue(entry.parsedValue)}`,
            )
            .join(", ")
        : "none";
    lines.push(
      `- ${projectValue.project.displayName} | default=${projectValue.parsedDefault ? formatParsedValue(projectValue.parsedDefault) : "missing"} | type=${projectValue.parameter.valueType || "unknown"} | description=${projectValue.parameter.description || "none"} | overrides: ${overrides}`,
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
