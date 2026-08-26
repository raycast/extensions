import { LinearClient, PaginationOrderBy } from "@linear/sdk";
import { withAccessToken } from "@raycast/utils";

import { linear } from "../api/linearClient";

import {
  afterDate,
  client,
  collect,
  PageInput,
  pick,
  resolveInitiative,
  resolveProjectLabel,
  resolveTeam,
  resolveUser,
} from "./linearUtils";

type ProjectFilter = NonNullable<Parameters<LinearClient["projects"]>[0]>["filter"];
type Field =
  | "id"
  | "name"
  | "summary"
  | "description"
  | "url"
  | "trashed"
  | "createdAt"
  | "updatedAt"
  | "startedAt"
  | "completedAt"
  | "canceledAt"
  | "startDate"
  | "startDateResolution"
  | "targetDate"
  | "targetDateResolution"
  | "priority"
  | "labels"
  | "initiatives"
  | "lead"
  | "status"
  | "teams"
  | "members"
  | "milestones";
interface Input extends PageInput {
  /** Max results (default 50, max 250) */ limit?: number;
  /** Next page cursor */ cursor?: string;
  /** Sort: createdAt | updatedAt */ orderBy?: "createdAt" | "updatedAt";
  query?: string;
  state?: string;
  initiative?: string;
  team?: string;
  member?: string;
  label?: string;
  createdAt?: string;
  updatedAt?: string;
  includeMilestones?: boolean;
  includeMembers?: boolean;
  includeArchived?: boolean;
  fields?: Field[];
}
const defaultFields: Field[] = ["id", "name", "summary", "description", "url", "priority", "createdAt", "updatedAt"];

export default withAccessToken(linear)(async (input: Input) => {
  const initiative = input.initiative ? await resolveInitiative(input.initiative) : undefined;
  const team = input.team ? await resolveTeam(input.team) : undefined;
  const member = input.member ? await resolveUser(input.member) : undefined;
  const label = input.label ? await resolveProjectLabel(input.label) : undefined;
  const createdAfter = afterDate(input.createdAt);
  const updatedAfter = afterDate(input.updatedAt);
  const filter: ProjectFilter = {
    name: input.query ? { containsIgnoreCase: input.query } : undefined,
    status: input.state
      ? {
          or: [
            { id: { eq: input.state } },
            { name: { eqIgnoreCase: input.state } },
            { type: { eqIgnoreCase: input.state } },
          ],
        }
      : undefined,
    initiatives: initiative ? { some: { id: { eq: initiative.id } } } : undefined,
    accessibleTeams: team ? { some: { id: { eq: team.id } } } : undefined,
    members: member ? { some: { id: { eq: member.id } } } : undefined,
    labels: label ? { some: { id: { eq: label.id } } } : undefined,
    createdAt: createdAfter ? { gte: createdAfter } : undefined,
    updatedAt: updatedAfter ? { gte: updatedAfter } : undefined,
  };
  const result = await collect(
    ({ first, after }) =>
      client().projects({
        first,
        after,
        filter,
        includeArchived: input.includeArchived,
        orderBy: input.orderBy === "createdAt" ? PaginationOrderBy.CreatedAt : PaginationOrderBy.UpdatedAt,
      }),
    input,
  );
  const nodes: Record<string, unknown>[] = [];
  for (const project of result.nodes) {
    const teams = input.fields?.includes("teams") ? (await project.teams({ first: 250 })).nodes : undefined;
    const members =
      input.includeMembers || input.fields?.includes("members")
        ? (await project.members({ first: 250 })).nodes
        : undefined;
    const initiatives = input.fields?.includes("initiatives")
      ? (await project.initiatives({ first: 250 })).nodes
      : undefined;
    const labels = input.fields?.includes("labels") ? (await project.labels({ first: 250 })).nodes : undefined;
    const record = {
      ...project,
      summary: project.description,
      description: project.content,
      teams,
      members,
      initiatives,
      labels,
      status: input.fields?.includes("status") ? await project.status : undefined,
      lead: input.fields?.includes("lead") ? await project.lead : undefined,
      milestones:
        input.includeMilestones || input.fields?.includes("milestones")
          ? (await project.projectMilestones({ first: 250 })).nodes
          : undefined,
    };
    nodes.push(
      pick<Record<string, unknown>, string>(
        record,
        input.fields?.length ? ["id", ...input.fields.filter((field) => field !== "id")] : defaultFields,
      ),
    );
  }
  return { ...result, nodes };
});
