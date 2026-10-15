export type WorkItemReference =
  | { type: "identifier"; projectIdentifier: string; sequenceId: number }
  | { type: "uuid"; projectId: string; workItemId: string };

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const IDENTIFIER_REGEX = /(?:^|[^A-Za-z0-9])([A-Za-z][A-Za-z0-9]{0,11})-(\d+)(?![A-Za-z0-9])/;
const PROJECT_WORK_ITEM_URL_REGEX = new RegExp(`/projects/(${UUID})/(?:issues|work-items)/(${UUID})`, "i");

/**
 * Parses a work item reference from free text: `ENG-123`, `eng-123`,
 * a browse URL (`https://app.plane.so/acme/browse/ENG-123/`),
 * or a project URL (`.../projects/{projectId}/issues/{workItemId}`).
 */
export function parseWorkItemReference(text: string | undefined | null): WorkItemReference | undefined {
  const value = (text ?? "").trim();
  if (!value) return undefined;

  const urlMatch = value.match(PROJECT_WORK_ITEM_URL_REGEX);
  if (urlMatch) {
    return { type: "uuid", projectId: urlMatch[1].toLowerCase(), workItemId: urlMatch[2].toLowerCase() };
  }

  const browseMatch = value.match(/\/browse\/([A-Za-z][A-Za-z0-9]{0,11})-(\d+)/);
  const match = browseMatch ?? value.match(IDENTIFIER_REGEX);
  if (!match) return undefined;

  const sequenceId = Number(match[2]);
  if (!Number.isSafeInteger(sequenceId) || sequenceId <= 0) return undefined;
  return { type: "identifier", projectIdentifier: match[1].toUpperCase(), sequenceId };
}

/** Parses only the `PROJ-123` form (used by command arguments). */
export function parseWorkItemIdentifier(
  text: string | undefined | null,
): { projectIdentifier: string; sequenceId: number } | undefined {
  const reference = parseWorkItemReference(text);
  return reference?.type === "identifier" ? reference : undefined;
}

export function formatWorkItemIdentifier(
  projectIdentifier: string | undefined,
  sequenceId: number | string | undefined,
) {
  return `${projectIdentifier ?? "?"}-${sequenceId ?? "?"}`;
}
