import { getApiBasePath, getAppBaseUrl } from "./urls";

/** Where a reference parsed from a Plane URL came from. Plain IDs like `ENG-123` have neither field. */
export type WorkItemReferenceSource = {
  /** Host of the pasted URL (lowercase, with port), e.g. `app.plane.so`. */
  host?: string;
  /** Workspace slug from the URL path, e.g. `acme` in `https://app.plane.so/acme/browse/ENG-123`. */
  workspaceSlug?: string;
};

export type IdentifierReference = { type: "identifier"; projectIdentifier: string; sequenceId: number };

export type WorkItemReference = (IdentifierReference | { type: "uuid"; projectId: string; workItemId: string }) &
  WorkItemReferenceSource;

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const IDENTIFIER_REGEX = /(?:^|[^A-Za-z0-9])([A-Za-z][A-Za-z0-9]{0,11})-(\d+)(?![A-Za-z0-9])/;
const BROWSE_REGEX = /\/browse\/([A-Za-z][A-Za-z0-9]{0,11})-(\d+)/;
const PROJECT_WORK_ITEM_URL_REGEX = new RegExp(`/projects/(${UUID})/(?:issues|work-items)/(${UUID})`, "i");
const URL_REGEX = /https?:\/\/[^\s<>"'`]+/i;

function toIdentifierReference(projectIdentifier: string, sequence: string): IdentifierReference | undefined {
  const sequenceId = Number(sequence);
  if (!Number.isSafeInteger(sequenceId) || sequenceId <= 0) return undefined;
  return { type: "identifier", projectIdentifier: projectIdentifier.toUpperCase(), sequenceId };
}

/** A work item path (`/projects/{id}/issues/{id}` or `/browse/ENG-123`) inside `value`. */
function parseWorkItemPath(value: string): WorkItemReference | undefined {
  const urlMatch = value.match(PROJECT_WORK_ITEM_URL_REGEX);
  if (urlMatch) {
    return { type: "uuid", projectId: urlMatch[1].toLowerCase(), workItemId: urlMatch[2].toLowerCase() };
  }
  const browseMatch = value.match(BROWSE_REGEX);
  return browseMatch ? toIdentifierReference(browseMatch[1], browseMatch[2]) : undefined;
}

/** The host and the workspace slug (the path segment before `browse` or `projects`) of a Plane URL. */
function parseUrlSource(url: string): WorkItemReferenceSource {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean);
    const index = segments.findIndex((segment) => segment === "browse" || segment === "projects");
    const workspaceSlug = index > 0 ? decodeURIComponent(segments[index - 1]) : undefined;
    return { host: parsed.host.toLowerCase(), ...(workspaceSlug ? { workspaceSlug } : {}) };
  } catch {
    return {};
  }
}

/**
 * Parses a work item reference from free text: `ENG-123`, `eng-123`,
 * a browse URL (`https://app.plane.so/acme/browse/ENG-123/`),
 * or a project URL (`.../projects/{projectId}/issues/{workItemId}`).
 * A reference from a URL keeps the URL's host and workspace slug, so callers can refuse links from elsewhere.
 */
export function parseWorkItemReference(text: string | undefined | null): WorkItemReference | undefined {
  const value = (text ?? "").trim();
  if (!value) return undefined;

  const url = value.match(URL_REGEX)?.[0];
  const fromUrl = url ? parseWorkItemPath(url) : undefined;
  if (url && fromUrl) return { ...fromUrl, ...parseUrlSource(url) };

  const fromPath = parseWorkItemPath(value);
  if (fromPath) return fromPath;
  const match = value.match(IDENTIFIER_REGEX);
  return match ? toIdentifierReference(match[1], match[2]) : undefined;
}

/** Parses only the `PROJ-123` form (used by arguments and AI tools). */
export function parseWorkItemIdentifier(
  text: string | undefined | null,
): (IdentifierReference & WorkItemReferenceSource) | undefined {
  const reference = parseWorkItemReference(text);
  return reference?.type === "identifier" ? reference : undefined;
}

function hostOf(url: string): string | undefined {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return undefined;
  }
}

/**
 * Why a reference can't be used with the current workspace, or undefined when it can. Plain IDs always can.
 * A URL must come from the current workspace and, when `knownHosts` is given, from one of those hosts.
 */
export function getReferenceWorkspaceProblem(
  reference: WorkItemReferenceSource,
  current: { workspaceSlug: string | undefined; knownHosts?: string[] },
): string | undefined {
  const hosts = (current.knownHosts ?? []).map((host) => host.toLowerCase());
  if (reference.host && hosts.length > 0 && !hosts.includes(reference.host)) {
    return `This link is from ${reference.host}, but this extension is set up for ${hosts[0]}. Change the App Base URL and API Base Path preferences to open it.`;
  }
  if (
    reference.workspaceSlug &&
    current.workspaceSlug &&
    reference.workspaceSlug.toLowerCase() !== current.workspaceSlug.toLowerCase()
  ) {
    return `This link is from workspace "${reference.workspaceSlug}"; switch workspace first (current: "${current.workspaceSlug}").`;
  }
  return undefined;
}

/** `getReferenceWorkspaceProblem` against the current workspace and the configured app and API hosts. */
export function checkReferenceWorkspace(
  reference: WorkItemReferenceSource,
  workspaceSlug: string | undefined,
): string | undefined {
  const knownHosts = [hostOf(getAppBaseUrl()), hostOf(getApiBasePath())].filter((host): host is string => !!host);
  return getReferenceWorkspaceProblem(reference, { workspaceSlug, knownHosts });
}

/** Throws when a reference parsed from a URL belongs to another workspace or Plane server. */
export function assertReferenceInWorkspace(reference: WorkItemReferenceSource, workspaceSlug: string | undefined) {
  const problem = checkReferenceWorkspace(reference, workspaceSlug);
  if (problem) throw new Error(problem);
}

export function formatWorkItemIdentifier(
  projectIdentifier: string | undefined,
  sequenceId: number | string | undefined,
) {
  return `${projectIdentifier ?? "?"}-${sequenceId ?? "?"}`;
}
