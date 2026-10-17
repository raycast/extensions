import { loadProjectSnapshots } from "../data";
import { aggregateParameters, formatParsedValue } from "../domain";
import { resolveProjectsForTool } from "../storage";
import { parseProjectRefs } from "./input-helpers";

type Input = {
  /**
   * Partial keyword to match against parameter keys (case-insensitive). For example "ocr" matches "ocr_enabled", "use_ocr_v2", etc.
   */
  query: string;
  /**
   * Optional saved group name used to scope the search.
   */
  groupName?: string;
  /**
   * Optional comma-separated project references. Each item can be a local id, Firebase projectId, or display name.
   */
  projectRefs?: string;
};

/**
 * Search Remote Config parameters by partial key name across selected Firebase projects.
 */
export default async function tool(input: Input): Promise<string> {
  const projects = await resolveProjectsForTool({
    groupName: input.groupName,
    projectRefs: parseProjectRefs(input.projectRefs),
  });

  if (projects.length === 0) {
    return "No enabled projects found. Add and enable Firebase projects in 'Manage Projects' first.";
  }

  const snapshots = await loadProjectSnapshots(projects);

  if (snapshots.length === 0) {
    return `Failed to fetch Remote Config from all ${projects.length} project(s). Check credentials and try again.`;
  }

  const allParameters = aggregateParameters(snapshots);
  const queryLower = input.query.toLowerCase();
  const matches = allParameters.filter((row) =>
    row.key.toLowerCase().includes(queryLower),
  );

  if (matches.length === 0) {
    return `No parameters matching "${input.query}" found across ${snapshots.length} project(s).`;
  }

  const lines = [`# Parameters matching "${input.query}"`, ""];
  lines.push(
    `Found ${matches.length} parameter(s) across ${snapshots.length} project(s).`,
  );
  lines.push("");

  for (const row of matches) {
    const firstValue = row.projectValues[0];
    const defaultDisplay = firstValue?.parsedDefault
      ? formatParsedValue(firstValue.parsedDefault)
      : "missing";
    const overrideInfo = row.hasConditionalValues ? "yes" : "no";
    lines.push(
      `- ${row.key} | type=${row.firebaseValueTypes.join("/") || "unknown"} | default=${defaultDisplay} | overrides=${overrideInfo} | in ${row.projectValues.length}/${snapshots.length} project(s)${row.divergentDefaults ? " | DIVERGENT" : ""}`,
    );
  }

  return lines.join("\n");
}
