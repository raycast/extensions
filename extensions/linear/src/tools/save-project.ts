import { DateResolutionType } from "@linear/sdk";
import { withAccessToken } from "@raycast/utils";

import { linear } from "../api/linearClient";

import {
  applyPatch,
  client,
  ContentPatch,
  resolveInitiative,
  resolveProject,
  resolveProjectLabel,
  resolveProjectStatus,
  resolveTeam,
  resolveUser,
} from "./linearUtils";
type Input = {
  id?: string;
  name?: string;
  icon?: string;
  color?: string;
  summary?: string;
  description?: string;
  patch?: {
    op: "replace" | "insert_before" | "insert_after" | "prepend" | "append" | "replace_range";
    old_string?: string;
    new_string?: string;
    replace_all?: boolean;
    anchor?: string;
    text?: string;
    from?: string;
    to?: string;
  }[];
  state?: string;
  startDate?: string;
  startDateResolution?: "halfYear" | "month" | "quarter" | "year";
  targetDate?: string;
  targetDateResolution?: "halfYear" | "month" | "quarter" | "year";
  priority?: number;
  addTeams?: string[];
  removeTeams?: string[];
  setTeams?: string[];
  labels?: string[];
  /** User ID, name, email, me, or the literal string null to remove the lead. */
  lead?: string;
  addInitiatives?: string[];
  removeInitiatives?: string[];
  setInitiatives?: string[];
  links?: { url: string; title: string }[];
};
async function ids(values: string[] | undefined, resolve: (value: string) => Promise<{ id: string }>) {
  return values ? Promise.all(values.map(async (value) => (await resolve(value)).id)) : undefined;
}
export default withAccessToken(linear)(async (input: Input) => {
  if (input.description !== undefined && input.patch) throw new Error("Pass description or patch, not both.");
  if (input.setTeams && (input.addTeams || input.removeTeams))
    throw new Error("setTeams cannot be combined with addTeams or removeTeams.");
  if (input.setInitiatives && (input.addInitiatives || input.removeInitiatives))
    throw new Error("setInitiatives cannot be combined with addInitiatives or removeInitiatives.");
  const project = input.id ? await resolveProject(input.id) : undefined;
  const content = input.patch ? applyPatch(project?.content ?? "", input.patch as ContentPatch[]) : input.description;
  const currentTeams = project ? (await project.teams({ first: 250 })).nodes.map((x) => x.id) : [];
  const addTeamIds = await ids(input.addTeams, resolveTeam),
    removeTeamIds = new Set(await ids(input.removeTeams, resolveTeam));
  const teamIds = input.setTeams
    ? await ids(input.setTeams, resolveTeam)
    : [...new Set([...currentTeams.filter((id) => !removeTeamIds.has(id)), ...(addTeamIds ?? [])])];
  const statusId = input.state ? (await resolveProjectStatus(input.state)).id : undefined;
  const labelIds = await ids(input.labels, resolveProjectLabel);
  const leadId = input.lead === "null" ? null : input.lead ? (await resolveUser(input.lead)).id : undefined;
  const resolution = (value: Input["startDateResolution"]) => value as DateResolutionType | undefined;
  const payload = {
    name: input.name,
    icon: input.icon,
    color: input.color,
    description: input.summary,
    content,
    statusId,
    startDate: input.startDate,
    startDateResolution: resolution(input.startDateResolution),
    targetDate: input.targetDate,
    targetDateResolution: resolution(input.targetDateResolution),
    priority: input.priority,
    teamIds,
    labelIds,
    leadId,
  };
  let saved;
  if (project) {
    const result = await client().updateProject(project.id, payload);
    if (!result.success || !result.project) throw new Error("Failed to update project.");
    saved = await result.project;
  } else {
    if (!input.name || !teamIds?.length)
      throw new Error("name and at least one team are required when creating a project.");
    const result = await client().createProject({ ...payload, name: input.name, teamIds });
    if (!result.success || !result.project) throw new Error("Failed to create project.");
    saved = await result.project;
  }
  const currentInitiatives = (await saved.initiativeToProjects({ first: 250 })).nodes;
  const currentById = new Map(
    currentInitiatives.flatMap((item) => (item.initiativeId ? [[item.initiativeId, item] as const] : [])),
  );
  const desired = input.setInitiatives
    ? new Set(await ids(input.setInitiatives, resolveInitiative))
    : new Set(currentById.keys());
  for (const id of (await ids(input.addInitiatives, resolveInitiative)) ?? []) desired.add(id);
  for (const id of (await ids(input.removeInitiatives, resolveInitiative)) ?? []) desired.delete(id);
  for (const [id, item] of currentById) {
    if (!desired.has(id)) {
      const result = await client().deleteInitiativeToProject(item.id);
      if (!result.success) throw new Error("Failed to remove initiative from project.");
    }
  }
  for (const id of desired) {
    if (!currentById.has(id)) {
      const result = await client().createInitiativeToProject({ initiativeId: id, projectId: saved.id });
      if (!result.success || !result.initiativeToProject) throw new Error("Failed to add initiative to project.");
    }
  }
  for (const link of input.links ?? []) {
    const result = await client().createEntityExternalLink({ projectId: saved.id, url: link.url, label: link.title });
    if (!result.success || !result.entityExternalLink) throw new Error("Failed to create project link.");
  }
  return {
    ...saved,
    summary: saved.description,
    description: saved.content,
  };
});
