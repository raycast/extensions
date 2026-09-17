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
  resolveProject,
  resolveTeam,
  resolveUser,
} from "./linearUtils";

type DocumentFilter = NonNullable<Parameters<LinearClient["documents"]>[0]>["filter"];
type Field =
  | "id"
  | "title"
  | "content"
  | "url"
  | "createdAt"
  | "updatedAt"
  | "archivedAt"
  | "creator"
  | "updatedBy"
  | "project"
  | "initiative"
  | "team"
  | "issue";
interface Input extends PageInput {
  /** Max results (default 50, max 250) */ limit?: number;
  /** Next page cursor */ cursor?: string;
  /** Sort: createdAt | updatedAt */ orderBy?: "createdAt" | "updatedAt";
  query?: string;
  projectId?: string;
  initiativeId?: string;
  teamId?: string;
  creatorId?: string;
  createdAt?: string;
  updatedAt?: string;
  includeArchived?: boolean;
  fields?: Field[];
}
const defaultFields = ["id", "title", "url", "createdAt", "updatedAt", "archivedAt"] as const;

export default withAccessToken(linear)(async (input: Input) => {
  const project = input.projectId ? await resolveProject(input.projectId) : undefined;
  const initiative = input.initiativeId ? await resolveInitiative(input.initiativeId) : undefined;
  const team = input.teamId ? await resolveTeam(input.teamId) : undefined;
  const creator = input.creatorId ? await resolveUser(input.creatorId) : undefined;
  const createdAfter = afterDate(input.createdAt);
  const updatedAfter = afterDate(input.updatedAt);
  const filter: DocumentFilter = {
    title: input.query ? { containsIgnoreCase: input.query } : undefined,
    project: project ? { id: { eq: project.id } } : undefined,
    initiative: initiative ? { id: { eq: initiative.id } } : undefined,
    team: team ? { id: { eq: team.id } } : undefined,
    creator: creator ? { id: { eq: creator.id } } : undefined,
    createdAt: createdAfter ? { gte: createdAfter } : undefined,
    updatedAt: updatedAfter ? { gte: updatedAfter } : undefined,
  };
  const result = await collect(
    ({ first, after }) =>
      client().documents({
        first,
        after,
        filter,
        includeArchived: input.includeArchived,
        orderBy: input.orderBy === "createdAt" ? PaginationOrderBy.CreatedAt : PaginationOrderBy.UpdatedAt,
      }),
    input,
  );
  const nodes = await Promise.all(
    result.nodes.map(async (document) => {
      const record: Record<string, unknown> = { ...document };
      if (input.fields?.includes("creator")) record.creator = await document.creator;
      if (input.fields?.includes("updatedBy")) record.updatedBy = await document.updatedBy;
      if (input.fields?.includes("project")) record.project = await document.project;
      if (input.fields?.includes("initiative")) record.initiative = await document.initiative;
      if (input.fields?.includes("issue")) record.issue = await document.issue;
      if (input.fields?.includes("team")) record.team = team;
      const fields = input.fields?.length
        ? (["id", ...input.fields.filter((field) => field !== "id")] as Field[])
        : defaultFields;
      return pick(record, fields);
    }),
  );
  return { ...result, nodes };
});
