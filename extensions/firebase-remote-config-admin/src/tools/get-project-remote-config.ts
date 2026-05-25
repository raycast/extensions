import { findProjectByReference } from "../storage";
import {
  getRemoteConfigTemplate,
  listRemoteConfigVersions,
} from "../remote-config-client";

type Input = {
  /**
   * Saved project reference. Can be the local id, Firebase projectId, or display name.
   */
  project: string;
};

/**
 * Fetch one Firebase Remote Config template and summarize parameters, conditions, and recent versions.
 */
export default async function tool(input: Input): Promise<string> {
  const project = await findProjectByReference(input.project);
  if (!project) {
    throw new Error(`Project not found: ${input.project}`);
  }

  const [{ template, etag }, versions] = await Promise.all([
    getRemoteConfigTemplate(project),
    listRemoteConfigVersions(project, 10),
  ]);

  const parameterEntries = Object.entries(template.parameters ?? {}).sort(
    ([left], [right]) => left.localeCompare(right),
  );
  const conditionEntries = [...(template.conditions ?? [])].sort(
    (left, right) => left.name.localeCompare(right.name),
  );

  const lines = [`# ${project.displayName}`, ""];
  lines.push(`- projectId: ${project.projectId}`);
  lines.push(`- parameters: ${parameterEntries.length}`);
  lines.push(`- conditions: ${conditionEntries.length}`);
  lines.push(`- etag: ${etag}`);
  lines.push("");

  const maxParams = 200;
  lines.push(
    `## Parameters${parameterEntries.length > maxParams ? ` (showing first ${maxParams} of ${parameterEntries.length})` : ""}`,
  );
  for (const [key, parameter] of parameterEntries.slice(0, maxParams)) {
    const overrideCount = Object.keys(parameter.conditionalValues ?? {}).length;
    lines.push(
      `- ${key} | type=${parameter.valueType || "unknown"} | default=${parameter.defaultValue?.value ?? "missing"}${overrideCount > 0 ? ` | overrides=${overrideCount}` : ""}${parameter.description ? ` | desc=${parameter.description}` : ""}`,
    );
  }
  lines.push("");

  const maxConditions = 100;
  lines.push(
    `## Conditions${conditionEntries.length > maxConditions ? ` (showing first ${maxConditions} of ${conditionEntries.length})` : ""}`,
  );
  for (const condition of conditionEntries.slice(0, maxConditions)) {
    lines.push(`- ${condition.name}: ${condition.expression}`);
  }
  lines.push("");

  lines.push("## Recent Versions");
  for (const version of versions.slice(0, 10)) {
    lines.push(
      `- v${version.versionNumber ?? "?"} | ${version.updateTime ?? "unknown time"} | ${version.updateType ?? "unknown"} | ${version.updateUser?.email ?? "unknown user"}`,
    );
  }

  return lines.join("\n");
}
