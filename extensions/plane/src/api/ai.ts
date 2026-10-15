import { PriorityEnum, Project, State } from "@makeplane/plane-node-sdk";
import { requirePlaneClient } from "./auth";
import { getMemberProjects, matchProject } from "./projects";
import { getMe } from "./users";
import { planeRequest, workspacePath } from "./request";
import type { RawUserLite, RawWorkItem } from "./types";
import { parseWorkItemReference } from "../helpers/identifiers";
import { parseHtmlToMarkdown } from "../helpers/parser";
import { getWorkItemUrlWithIdentifier } from "../helpers/work-items";
import { getExpandedAssignees, getExpandedLabels, getExpandedState } from "../helpers/work-item-summary";

/** Helpers shared by the AI tools: resolve names to ids and serialize plain results. */

let projectsPromise: Promise<Project[]> | undefined;
export function getCachedProjects(): Promise<Project[]> {
  if (!projectsPromise) {
    projectsPromise = getMemberProjects().catch((error) => {
      projectsPromise = undefined;
      throw error;
    });
  }
  return projectsPromise;
}

export async function resolveProject(query: string): Promise<Project & { id: string }> {
  const projects = await getCachedProjects();
  const project = matchProject(projects, query);
  if (!project?.id) {
    const known = projects.map((item) => item.identifier).join(", ");
    throw new Error(`Project "${query}" not found. Known project identifiers: ${known || "none"}.`);
  }
  return project as Project & { id: string };
}

const statesByProject = new Map<string, Promise<State[]>>();
export function getProjectStates(projectId: string): Promise<State[]> {
  let promise = statesByProject.get(projectId);
  if (!promise) {
    const client = requirePlaneClient();
    promise = client.statesApi
      .listStates({ slug: client.workspaceSlug, projectId, perPage: 100 })
      .then((response) => response.results ?? []);
    statesByProject.set(projectId, promise);
  }
  return promise;
}

/** Matches a state by id, name, or group (`started`, `completed`, ...). Case-insensitive. */
export async function resolveState(projectId: string, query: string): Promise<State & { id: string }> {
  const states = await getProjectStates(projectId);
  const needle = query.trim().toLowerCase();
  const groupAliases: Record<string, string> = { done: "completed", todo: "unstarted", "in progress": "started" };
  const group = groupAliases[needle] ?? needle;
  const state =
    states.find((item) => item.id === query.trim()) ??
    states.find((item) => item.name.toLowerCase() === needle) ??
    states.find((item) => item.group === group && item._default) ??
    states.find((item) => item.group === group);
  if (!state?.id) {
    throw new Error(`State "${query}" not found. Available states: ${states.map((item) => item.name).join(", ")}.`);
  }
  return state as State & { id: string };
}

export function resolvePriority(value: string): PriorityEnum {
  const normalized = value.trim().toLowerCase();
  const priorities = Object.values(PriorityEnum) as string[];
  if (!priorities.includes(normalized)) {
    throw new Error(`Priority must be one of: ${priorities.join(", ")}.`);
  }
  return normalized as PriorityEnum;
}

export type ToolMember = { id: string; displayName?: string; name?: string; email?: string | null };

function toToolMember(user: {
  id?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  email?: string | null;
}): ToolMember {
  return {
    id: user.id ?? "",
    displayName: user.displayName,
    name: [user.firstName, user.lastName].filter(Boolean).join(" ") || undefined,
    email: user.email,
  };
}

function isBot(member: ToolMember) {
  return !!member.email && (member.email.endsWith("-intake@plane.so") || member.email.endsWith("_bot@plane.so"));
}

export async function getMembers(projectId?: string): Promise<ToolMember[]> {
  const client = requirePlaneClient();
  const users = projectId
    ? await client.membersApi.getProjectMembers({ slug: client.workspaceSlug, projectId })
    : await client.membersApi.getWorkspaceMembers({ slug: client.workspaceSlug });
  return users.map(toToolMember).filter((member) => member.id && !isBot(member));
}

/** Resolves "me", an id, email, display name, or full name to a member id. */
export async function resolveMemberIds(projectId: string, queries: string[]): Promise<string[]> {
  if (queries.length === 0) return [];
  const members = await getMembers(projectId);
  const ids: string[] = [];
  for (const query of queries) {
    const needle = query.trim().toLowerCase();
    if (needle === "me") {
      const me = await getMe();
      if (me.id) ids.push(me.id);
      continue;
    }
    const exact = members.find(
      (member) =>
        member.id === query.trim() ||
        member.email?.toLowerCase() === needle ||
        member.displayName?.toLowerCase() === needle ||
        member.name?.toLowerCase() === needle,
    );
    const partial = members.filter(
      (member) => member.name?.toLowerCase().includes(needle) || member.displayName?.toLowerCase().includes(needle),
    );
    const match = exact ?? (partial.length === 1 ? partial[0] : undefined);
    if (!match) {
      throw new Error(
        partial.length > 1
          ? `"${query}" matches several members: ${partial.map((member) => member.displayName).join(", ")}. Be more specific.`
          : `Member "${query}" not found in this project.`,
      );
    }
    ids.push(match.id);
  }
  return [...new Set(ids)];
}

/** `YYYY-MM-DD`, or null for the literal "null" (clears the date). Undefined stays undefined. */
export function parseToolDate(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value.trim().toLowerCase() === "null" || value.trim() === "") return null;
  const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  if (!match || Number.isNaN(new Date(match[1]).getTime())) {
    throw new Error(`Invalid date "${value}". Use YYYY-MM-DD, or "null" to clear.`);
  }
  return match[1];
}

/** Fetches a work item by `ENG-123` or a Plane URL, with state, assignees, and labels expanded. */
export async function fetchWorkItem(
  reference: string,
): Promise<{ raw: RawWorkItem; project: Project & { id: string } }> {
  const parsed = parseWorkItemReference(reference);
  if (!parsed) throw new Error(`"${reference}" is not a work item ID like ENG-123 or a Plane work item URL.`);
  const query = { expand: "state,assignees,labels" };
  const raw =
    parsed.type === "identifier"
      ? await planeRequest<RawWorkItem>(
          workspacePath("work-items", `${parsed.projectIdentifier}-${parsed.sequenceId}`),
          { query },
        )
      : await planeRequest<RawWorkItem>(workspacePath("projects", parsed.projectId, "work-items", parsed.workItemId), {
          query,
        });
  const projects = await getCachedProjects();
  const project = projects.find((item) => item.id === raw.project);
  if (!project?.id) throw new Error("The work item's project is not accessible.");
  return { raw, project: project as Project & { id: string } };
}

function userLabel(user: RawUserLite) {
  return user.display_name || [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email || user.id;
}

/**
 * A work item as the AI tools return it. Declared explicitly: Raycast's tool schema extraction (CLI 2.7) fails on
 * return types it has to infer through other modules.
 */
export type ToolWorkItem = {
  id: string;
  identifier: string;
  name: string;
  url: string;
  project: string;
  projectName?: string;
  state?: string;
  stateGroup?: string;
  priority?: string | null;
  assignees?: string[];
  labels?: string[];
  startDate?: string;
  dueDate?: string;
  createdAt?: string;
  updatedAt?: string;
  description?: string;
};

export function serializeWorkItem(
  raw: RawWorkItem,
  project: Pick<Project, "identifier" | "name">,
  options: { includeDescription?: boolean } = {},
): ToolWorkItem {
  const client = requirePlaneClient();
  const identifier = `${project.identifier}-${raw.sequence_id}`;
  const state = getExpandedState(raw);
  const assignees = getExpandedAssignees(raw);
  const labels = getExpandedLabels(raw);
  return {
    id: raw.id,
    identifier,
    name: raw.name,
    url: getWorkItemUrlWithIdentifier(client.workspaceSlug, identifier),
    project: project.identifier,
    projectName: project.name,
    state: state?.name,
    stateGroup: state?.group,
    priority: raw.priority,
    assignees: assignees.length > 0 ? assignees.map(userLabel) : (raw.assignees as string[] | undefined),
    labels: labels.length > 0 ? labels.map((label) => label.name) : undefined,
    startDate: raw.start_date ?? undefined,
    dueDate: raw.target_date ?? undefined,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    ...(options.includeDescription && raw.description_html
      ? { description: parseHtmlToMarkdown(raw.description_html).slice(0, 4000) }
      : {}),
  };
}
