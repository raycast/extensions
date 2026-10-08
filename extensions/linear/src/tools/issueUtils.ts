import { Issue, IssueRelationType, LinearClient, SLADayCountType } from "@linear/sdk";

import {
  client,
  resolveCycle,
  resolveIssue,
  resolveIssueLabel,
  resolveIssueLabelForTeam,
  resolveMilestone,
  resolveProject,
  resolveRelease,
  resolveTeam,
  resolveUser,
} from "./linearUtils";

export async function resolveWorkflowState(query: string, teamQuery: string) {
  const team = await resolveTeam(teamQuery);
  const states = (await team.states({ first: 250 })).nodes;
  const normalized = query.toLowerCase();
  const matches = states.filter(
    (state) =>
      state.id.toLowerCase() === normalized || state.name.toLowerCase() === normalized || state.type === normalized,
  );
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) throw new Error(`Multiple issue statuses match "${query}" in ${team.name}. Use an ID.`);
  throw new Error(`No issue status found for "${query}" in ${team.name}.`);
}

export async function issueInput(input: {
  team?: string;
  /** Team of the issue being updated, used to resolve label names when `team` is not changing. */
  currentTeamId?: string;
  cycle?: string | null;
  milestone?: string;
  project?: string | null;
  state?: string;
  assignee?: string | null;
  delegate?: string | null;
  labels?: string[];
  dueDate?: string | null;
  slaBreachesAt?: string | null;
  slaType?: "all" | "onlyBusinessDays" | null;
  parentId?: string | null;
  estimate?: number | null;
  title?: string;
  description?: string;
  priority?: number;
}) {
  const team = input.team ? await resolveTeam(input.team) : undefined;
  const project = typeof input.project === "string" ? await resolveProject(input.project) : undefined;
  const state = input.state ? await resolveWorkflowState(input.state, team?.id ?? input.team ?? "") : undefined;
  const cycle = typeof input.cycle === "string" ? await resolveCycle(input.cycle, team?.id) : undefined;
  const milestone = input.milestone
    ? await resolveMilestone(project?.id ?? input.project ?? "", input.milestone)
    : undefined;
  return {
    title: input.title,
    description: input.description,
    teamId: team?.id,
    cycleId: input.cycle === null ? null : cycle?.id,
    projectId: input.project === null ? null : project?.id,
    projectMilestoneId: milestone?.id,
    stateId: state?.id,
    assigneeId:
      input.assignee === null
        ? null
        : typeof input.assignee === "string"
          ? (await resolveUser(input.assignee)).id
          : undefined,
    delegateId:
      input.delegate === null
        ? null
        : typeof input.delegate === "string"
          ? (await resolveUser(input.delegate)).id
          : undefined,
    labelIds: input.labels ? await resolveLabelIds(input.labels, team?.id ?? input.currentTeamId) : undefined,
    dueDate: input.dueDate,
    slaBreachesAt:
      input.slaBreachesAt === null ? null : input.slaBreachesAt ? new Date(input.slaBreachesAt) : undefined,
    slaType: input.slaType as SLADayCountType | null | undefined,
    parentId:
      input.parentId === null
        ? null
        : typeof input.parentId === "string"
          ? (await resolveIssue(input.parentId)).id
          : undefined,
    estimate: input.estimate,
    priority: input.priority,
  };
}

export async function setIssueRelations(
  issue: Issue,
  additions: { blocks?: string[]; blockedBy?: string[]; relatedTo?: string[]; duplicateOf?: string | null },
  removals: { removeBlocks?: string[]; removeBlockedBy?: string[]; removeRelatedTo?: string[] },
) {
  const add = async (values: string[] | undefined, type: IssueRelationType, inverse = false) => {
    for (const value of values ?? []) {
      const related = await resolveIssue(value);
      const result = await client().createIssueRelation({
        issueId: inverse ? related.id : issue.id,
        relatedIssueId: inverse ? issue.id : related.id,
        type,
      });
      if (!result.success || !result.issueRelation) throw new Error("Failed to create issue relation.");
    }
  };
  await add(additions.blocks, IssueRelationType.Blocks);
  await add(additions.blockedBy, IssueRelationType.Blocks, true);
  await add(additions.relatedTo, IssueRelationType.Related);
  if (additions.duplicateOf !== undefined) {
    const duplicateRelations = (await issue.relations({ first: 250 })).nodes.filter(
      (relation) => relation.type === IssueRelationType.Duplicate,
    );
    if (additions.duplicateOf === null) {
      for (const relation of duplicateRelations) {
        const result = await client().deleteIssueRelation(relation.id);
        if (!result.success) throw new Error("Failed to remove duplicate issue relation.");
      }
    } else {
      const duplicate = await resolveIssue(additions.duplicateOf);
      for (const relation of duplicateRelations) {
        if (relation.relatedIssueId !== duplicate.id) {
          const result = await client().deleteIssueRelation(relation.id);
          if (!result.success) throw new Error("Failed to remove duplicate issue relation.");
        }
      }
      if (!duplicateRelations.some((relation) => relation.relatedIssueId === duplicate.id)) {
        await add([duplicate.id], IssueRelationType.Duplicate);
      }
    }
  }

  const remove = async (values: string[] | undefined, type: string, inverse = false) => {
    if (!values?.length) return;
    const targetIds = new Set(await Promise.all(values.map(async (value) => (await resolveIssue(value)).id)));
    const relations = inverse
      ? (await issue.inverseRelations({ first: 250 })).nodes
      : (await issue.relations({ first: 250 })).nodes;
    for (const relation of relations) {
      const target = inverse ? relation.issueId : relation.relatedIssueId;
      if (relation.type === type && target && targetIds.has(target)) {
        const result = await client().deleteIssueRelation(relation.id);
        if (!result.success) throw new Error("Failed to remove issue relation.");
      }
    }
  };
  await remove(removals.removeBlocks, "blocks");
  await remove(removals.removeBlockedBy, "blocks", true);
  await remove(removals.removeRelatedTo, "related");
}

export async function setIssueReleases(
  issue: Issue,
  input: { setReleases?: string[]; addReleases?: string[]; removeReleases?: string[] },
) {
  if (input.setReleases && (input.addReleases || input.removeReleases)) {
    throw new Error("setReleases cannot be combined with addReleases or removeReleases.");
  }
  const current = (await issue.releases({ first: 250 })).nodes;
  const desired = input.setReleases ? new Set<string>() : new Set(current.map((release) => release.id));
  for (const value of input.setReleases ?? input.addReleases ?? []) desired.add((await resolveRelease(value)).id);
  for (const value of input.removeReleases ?? []) desired.delete((await resolveRelease(value)).id);
  for (const release of current) {
    if (!desired.has(release.id)) {
      const result = await client().issueToReleaseDeleteByIssueAndRelease(issue.id, release.id);
      if (!result.success) throw new Error("Failed to remove issue release.");
    }
  }
  const currentIds = new Set(current.map((release) => release.id));
  for (const releaseId of desired) {
    if (!currentIds.has(releaseId)) {
      const result = await client().createIssueToRelease({ issueId: issue.id, releaseId });
      if (!result.success || !result.issueToRelease) throw new Error("Failed to add issue release.");
    }
  }
}

export type IssueUpdateInput = Parameters<LinearClient["updateIssue"]>[1];

/** Resolves label names within the issue's team when known, since names like "Bug" repeat across teams and are only unambiguous per team. */
async function resolveLabelIds(labels: string[], teamId?: string) {
  return Promise.all(
    labels.map(async (label) =>
      teamId ? (await resolveIssueLabelForTeam(label, teamId)).id : (await resolveIssueLabel(label)).id,
    ),
  );
}
