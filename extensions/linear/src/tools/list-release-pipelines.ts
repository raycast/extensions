import { LinearClient, PaginationOrderBy, ReleasePipelineType } from "@linear/sdk";
import { withAccessToken } from "@raycast/utils";

import { linear } from "../api/linearClient";

import { afterDate, client, collect, PageInput, resolveTeam } from "./linearUtils";

type ReleasePipelineFilter = NonNullable<Parameters<LinearClient["releasePipelines"]>[0]>["filter"];

interface Input extends PageInput {
  /** Max results (default 50, max 250) */ limit?: number;
  /** Next page cursor */ cursor?: string;
  /** Sort: createdAt | updatedAt */ orderBy?: "createdAt" | "updatedAt";
  query?: string;
  team?: string;
  type?: "continuous" | "scheduled";
  isProduction?: boolean;
  includeStages?: boolean;
  includeTeams?: boolean;
  createdAt?: string;
  updatedAt?: string;
  includeArchived?: boolean;
}

export default withAccessToken(linear)(async (input: Input) => {
  const team = input.team ? await resolveTeam(input.team) : undefined;
  const createdAfter = afterDate(input.createdAt);
  const updatedAfter = afterDate(input.updatedAt);
  const filter: ReleasePipelineFilter = {
    name: input.query ? { containsIgnoreCase: input.query } : undefined,
    teams: team ? { some: { id: { eq: team.id } } } : undefined,
    type: input.type ? { eq: input.type as ReleasePipelineType } : undefined,
    isProduction: input.isProduction === undefined ? undefined : { eq: input.isProduction },
    createdAt: createdAfter ? { gte: createdAfter } : undefined,
    updatedAt: updatedAfter ? { gte: updatedAfter } : undefined,
  };
  const result = await collect(
    ({ first, after }) =>
      client().releasePipelines({
        first,
        after,
        filter,
        includeArchived: input.includeArchived,
        orderBy: input.orderBy === "createdAt" ? PaginationOrderBy.CreatedAt : PaginationOrderBy.UpdatedAt,
      }),
    input,
  );
  return {
    ...result,
    nodes: await Promise.all(
      result.nodes.map(async (pipeline) => ({
        ...pipeline,
        stages: input.includeStages ? (await pipeline.stages({ first: 250 })).nodes : undefined,
        teams: input.includeTeams ? (await pipeline.teams({ first: 250 })).nodes : undefined,
      })),
    ),
  };
});
