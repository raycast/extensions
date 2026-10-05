import { LinearClient, PaginationOrderBy } from "@linear/sdk";

import {
  afterDate,
  client,
  collect,
  PageInput,
  resolveInitiative,
  resolveProjectLabel,
  resolveTeam,
  resolveUser,
} from "./linearUtils";
import {
  Plain,
  initiativeRef,
  labelRef,
  pickFields,
  related,
  serializeMilestone,
  serializeProject,
  serializeProjectStatus,
  teamRef,
  userRef,
} from "./serializers";
import { withLinear } from "./withLinear";

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

export default withLinear(async (input: Input) => {
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
  const requested: Field[] = input.fields?.length
    ? ["id", ...input.fields.filter((field) => field !== "id")]
    : [...defaultFields];
  if (input.includeMembers && !requested.includes("members")) requested.push("members");
  if (input.includeMilestones && !requested.includes("milestones")) requested.push("milestones");
  const wants = (field: Field) => requested.includes(field);
  const nodes = await Promise.all(
    result.nodes.map(async (project) => {
      const record: Record<string, Plain> = {
        ...serializeProject(project),
        teams: wants("teams") ? (await project.teams({ first: 250 })).nodes.map(teamRef) : undefined,
        members: wants("members") ? (await project.members({ first: 250 })).nodes.map(userRef) : undefined,
        initiatives: wants("initiatives")
          ? (await project.initiatives({ first: 250 })).nodes.map(initiativeRef)
          : undefined,
        labels: wants("labels") ? (await project.labels({ first: 250 })).nodes.map(labelRef) : undefined,
        status: wants("status") ? await related(project.status, serializeProjectStatus) : undefined,
        lead: wants("lead") ? await related(project.lead, userRef) : undefined,
        milestones: wants("milestones")
          ? (await project.projectMilestones({ first: 250 })).nodes.map(serializeMilestone)
          : undefined,
      };
      return pickFields(record, requested);
    }),
  );
  return { ...result, nodes };
});
