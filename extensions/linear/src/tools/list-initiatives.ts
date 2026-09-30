import { LinearClient, PaginationOrderBy } from "@linear/sdk";
import { withAccessToken } from "@raycast/utils";

import { linear } from "../api/linearClient";

import { InitiativeField, initiativeStatus, serializeInitiative } from "./initiativeUtils";
import {
  afterDate,
  client,
  collect,
  PageInput,
  resolveInitiative,
  resolveInitiativeLabel,
  resolveTeam,
  resolveUser,
} from "./linearUtils";

type InitiativeFilter = NonNullable<Parameters<LinearClient["initiatives"]>[0]>["filter"];

interface Input extends PageInput {
  /** Max results (default 50, max 250) */ limit?: number;
  /** Next page cursor */ cursor?: string;
  /** Sort: createdAt | updatedAt */ orderBy?: "createdAt" | "updatedAt";
  query?: string;
  status?: string;
  owner?: string;
  leadTeam?: string;
  parentInitiative?: string;
  label?: string;
  createdAt?: string;
  updatedAt?: string;
  includeArchived?: boolean;
  includeProjects?: boolean;
  includeSubInitiatives?: boolean;
  fields?: InitiativeField[];
}

export default withAccessToken(linear)(async (input: Input) => {
  const owner = input.owner ? await resolveUser(input.owner) : undefined;
  const team = input.leadTeam ? await resolveTeam(input.leadTeam) : undefined;
  const parent = input.parentInitiative ? await resolveInitiative(input.parentInitiative) : undefined;
  const label = input.label ? await resolveInitiativeLabel(input.label) : undefined;
  const status = initiativeStatus(input.status);
  const createdAfter = afterDate(input.createdAt);
  const updatedAfter = afterDate(input.updatedAt);
  const filter: InitiativeFilter = {
    name: input.query ? { containsIgnoreCase: input.query } : undefined,
    status: status ? { eq: status } : undefined,
    owner: owner ? { id: { eq: owner.id } } : undefined,
    leadTeam: team ? { id: { eq: team.id } } : undefined,
    ancestors: parent ? { some: { id: { eq: parent.id } } } : undefined,
    labels: label ? { some: { id: { eq: label.id } } } : undefined,
    createdAt: createdAfter ? { gte: createdAfter } : undefined,
    updatedAt: updatedAfter ? { gte: updatedAfter } : undefined,
  };
  const result = await collect(
    ({ first, after }) =>
      client().initiatives({
        first,
        after,
        filter,
        includeArchived: input.includeArchived,
        orderBy: input.orderBy === "createdAt" ? PaginationOrderBy.CreatedAt : PaginationOrderBy.UpdatedAt,
      }),
    input,
  );
  const fields = [
    ...(input.fields ?? []),
    ...(input.includeProjects ? ["projects" as const] : []),
    ...(input.includeSubInitiatives ? ["subInitiatives" as const] : []),
  ];
  return {
    ...result,
    nodes: await Promise.all(result.nodes.map((initiative) => serializeInitiative(initiative, fields))),
  };
});
