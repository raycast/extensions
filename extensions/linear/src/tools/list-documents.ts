import { LinearClient, PaginationOrderBy } from "@linear/sdk";

import {
  afterDate,
  client,
  collect,
  PageInput,
  resolveInitiative,
  resolveProject,
  resolveTeam,
  resolveUser,
} from "./linearUtils";
import {
  Plain,
  initiativeRef,
  issueRef,
  pickFields,
  projectRef,
  related,
  serializeDocument,
  teamRef,
  userRef,
} from "./serializers";
import { withLinear } from "./withLinear";

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

export default withLinear(async (input: Input) => {
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
  const fields: readonly Field[] = input.fields?.length
    ? ["id", ...input.fields.filter((field) => field !== "id")]
    : defaultFields;
  const wants = (field: Field) => fields.includes(field);
  const nodes = await Promise.all(
    result.nodes.map(async (document) => {
      const record: Record<string, Plain> = {
        ...serializeDocument(document, { content: wants("content") }),
        creator: wants("creator") ? await related(document.creator, userRef) : undefined,
        updatedBy: wants("updatedBy") ? await related(document.updatedBy, userRef) : undefined,
        project: wants("project") ? await related(document.project, projectRef) : undefined,
        initiative: wants("initiative") ? await related(document.initiative, initiativeRef) : undefined,
        issue: wants("issue") ? await related(document.issue, issueRef) : undefined,
        team: wants("team") && team ? teamRef(team) : undefined,
      };
      return pickFields(record, fields);
    }),
  );
  return { ...result, nodes };
});
