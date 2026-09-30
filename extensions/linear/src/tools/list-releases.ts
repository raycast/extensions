import { LinearClient, PaginationOrderBy, ReleaseStageType } from "@linear/sdk";
import { withAccessToken } from "@raycast/utils";

import { linear } from "../api/linearClient";

import { afterDate, client, collect, PageInput, resolveReleasePipeline } from "./linearUtils";

type ReleaseFilter = NonNullable<Parameters<LinearClient["releases"]>[0]>["filter"];

interface Input extends PageInput {
  /** Max results (default 50, max 250) */ limit?: number;
  /** Next page cursor */ cursor?: string;
  /** Sort: createdAt | updatedAt */ orderBy?: "createdAt" | "updatedAt";
  query?: string;
  pipeline?: string;
  stage?: string;
  stageType?: "planned" | "started" | "completed" | "canceled";
  version?: string;
  hasReleaseNotes?: boolean;
  includeReleaseNotes?: boolean;
  createdAt?: string;
  updatedAt?: string;
  includeArchived?: boolean;
}

export default withAccessToken(linear)(async (input: Input) => {
  const pipeline = input.pipeline ? await resolveReleasePipeline(input.pipeline) : undefined;
  const createdAfter = afterDate(input.createdAt);
  const updatedAfter = afterDate(input.updatedAt);
  const filter: ReleaseFilter = {
    or: input.query
      ? [{ name: { containsIgnoreCase: input.query } }, { version: { containsIgnoreCase: input.query } }]
      : undefined,
    pipeline: pipeline ? { id: { eq: pipeline.id } } : undefined,
    stage:
      input.stage || input.stageType
        ? {
            and: [
              ...(input.stage
                ? [
                    {
                      or: [{ id: { eq: input.stage } }, { name: { eqIgnoreCase: input.stage } }],
                    },
                  ]
                : []),
              ...(input.stageType ? [{ type: { eq: input.stageType as ReleaseStageType } }] : []),
            ],
          }
        : undefined,
    version: input.version ? { eq: input.version } : undefined,
    hasReleaseNotes: input.hasReleaseNotes === undefined ? undefined : { eq: input.hasReleaseNotes },
    createdAt: createdAfter ? { gte: createdAfter } : undefined,
    updatedAt: updatedAfter ? { gte: updatedAfter } : undefined,
  };
  const result = await collect(
    ({ first, after }) =>
      client().releases({
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
      result.nodes.map(async (release) => ({
        ...release,
        pipelineId: release.pipelineId,
        stage: input.stage || input.stageType ? await release.stage : undefined,
        hasReleaseNotes: release.releaseNotes.length > 0,
        releaseNotes: input.includeReleaseNotes ? release.releaseNotes : undefined,
      })),
    ),
  };
});
