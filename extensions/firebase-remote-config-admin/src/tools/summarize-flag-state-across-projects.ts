import { loadProjectSnapshots } from "../data";
import { aggregateParameters } from "../domain";
import { resolveProjectsForTool } from "../storage";
import { parseProjectRefs } from "./input-helpers";

type Input = {
  /**
   * Remote Config flag key to summarize across projects.
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

function coerceBoolean(raw: string | undefined): string {
  if (!raw) return "missing";
  const normalized = raw.trim().toLowerCase();
  if (normalized === "true") return "enabled";
  if (normalized === "false") return "disabled";
  return `non-bool(${raw})`;
}

/**
 * Summarize whether a feature flag is enabled, disabled, or overridden across selected Firebase projects.
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
    return `Flag ${input.key} not found in the selected projects.`;
  }

  const lines = [`# Flag ${row.key}`, ""];
  for (const projectValue of row.projectValues) {
    const defaultRaw = projectValue.parsedDefault?.raw;
    const overrideSummary = projectValue.conditionalValues
      .map(
        (entry) => `${entry.conditionName}=${coerceBoolean(entry.value.value)}`,
      )
      .join(", ");
    lines.push(
      `- ${projectValue.project.displayName} | default=${coerceBoolean(defaultRaw)} | overrides=${overrideSummary || "none"}`,
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
