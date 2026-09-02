import { Initiative, InitiativeStatus, LinearClient } from "@linear/sdk";

import { client, resolveInitiative, resolveInitiativeLabel, resolveTeam, resolveUser } from "./linearUtils";

export type InitiativeField =
  | "id"
  | "name"
  | "summary"
  | "description"
  | "url"
  | "status"
  | "priority"
  | "targetDate"
  | "health"
  | "createdAt"
  | "updatedAt"
  | "owner"
  | "creator"
  | "leadTeam"
  | "parentInitiatives"
  | "labels"
  | "projects"
  | "subInitiatives";

export const defaultInitiativeFields: InitiativeField[] = [
  "id",
  "name",
  "summary",
  "description",
  "url",
  "status",
  "priority",
  "targetDate",
  "health",
  "owner",
  "leadTeam",
];

export async function serializeInitiative(initiative: Initiative, fields?: InitiativeField[]) {
  const selected = new Set(fields?.length ? ["id", ...fields] : defaultInitiativeFields);
  const result: Record<string, unknown> = { id: initiative.id };
  const direct: Partial<Record<InitiativeField, unknown>> = {
    name: initiative.name,
    summary: initiative.description,
    description: initiative.content,
    url: initiative.url,
    status: initiative.status,
    priority: initiative.priority,
    targetDate: initiative.targetDate,
    health: initiative.health,
    createdAt: initiative.createdAt,
    updatedAt: initiative.updatedAt,
  };
  for (const field of selected) {
    if (field in direct) result[field] = direct[field as InitiativeField];
  }
  if (selected.has("owner")) result.owner = initiative.owner ? await initiative.owner : undefined;
  if (selected.has("creator")) result.creator = initiative.creator ? await initiative.creator : undefined;
  if (selected.has("leadTeam")) result.leadTeam = initiative.leadTeam ? await initiative.leadTeam : undefined;
  if (selected.has("parentInitiatives"))
    result.parentInitiatives = initiative.parentInitiative ? [await initiative.parentInitiative] : [];
  if (selected.has("labels")) result.labels = (await initiative.labels({ first: 250 })).nodes;
  if (selected.has("projects")) result.projects = (await initiative.projects({ first: 250 })).nodes;
  if (selected.has("subInitiatives")) result.subInitiatives = (await initiative.subInitiatives({ first: 250 })).nodes;
  return result;
}

export function initiativeStatus(value?: string): InitiativeStatus | undefined {
  if (!value) return undefined;
  const found = Object.values(InitiativeStatus).find((status) => status.toLowerCase() === value.toLowerCase());
  if (!found) throw new Error(`Invalid initiative status: "${value}".`);
  return found;
}

export async function initiativeInput(input: {
  name?: string;
  summary?: string;
  description?: string;
  color?: string;
  icon?: string;
  status?: string;
  priority?: number;
  targetDate?: string;
  owner?: string | null;
  leadTeam?: string | null;
  labels?: string[];
}) {
  return {
    name: input.name,
    description: input.summary,
    content: input.description,
    color: input.color,
    icon: input.icon,
    status: initiativeStatus(input.status),
    priority: input.priority,
    targetDate: input.targetDate,
    ownerId:
      input.owner === null ? null : typeof input.owner === "string" ? (await resolveUser(input.owner)).id : undefined,
    leadTeamId:
      input.leadTeam === null
        ? null
        : typeof input.leadTeam === "string"
          ? (await resolveTeam(input.leadTeam)).id
          : undefined,
    labelIds: input.labels
      ? await Promise.all(input.labels.map(async (label) => (await resolveInitiativeLabel(label)).id))
      : undefined,
  };
}

export async function addParentInitiatives(initiative: Initiative, values?: string[]) {
  if (!values?.length) return;

  const existingParentId = initiative.parentInitiativeId;
  const requestedParentIds = new Set<string>();
  for (const value of values) requestedParentIds.add((await resolveInitiative(value)).id);

  for (const parentId of requestedParentIds) {
    if (parentId === initiative.id) throw new Error("An initiative cannot be its own parent.");
    if (parentId === existingParentId) continue;
    await client().createInitiativeRelation({ initiativeId: parentId, relatedInitiativeId: initiative.id });
  }
}

export type InitiativeUpdateInput = Parameters<LinearClient["updateInitiative"]>[1];
