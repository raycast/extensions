import { LinearClient, PaginationOrderBy } from "@linear/sdk";
import { withAccessToken } from "@raycast/utils";

import { linear } from "../api/linearClient";

import { afterDate, client, collect, PageInput, resolveRelease, resolveReleasePipeline } from "./linearUtils";

type ReleaseNoteFilter = NonNullable<Parameters<LinearClient["releaseNotes"]>[0]>["filter"];

interface Input extends PageInput {
  /** Max results (default 50, max 250) */ limit?: number;
  /** Next page cursor */ cursor?: string;
  /** Sort: createdAt | updatedAt */ orderBy?: "createdAt" | "updatedAt";
  query?: string;
  pipeline?: string;
  release?: string;
  includeContent?: boolean;
  includeReleases?: boolean;
  createdAt?: string;
  updatedAt?: string;
  includeArchived?: boolean;
}

export default withAccessToken(linear)(async (input: Input) => {
  const pipeline = input.pipeline ? await resolveReleasePipeline(input.pipeline) : undefined;
  const release = input.release ? await resolveRelease(input.release) : undefined;
  const createdAfter = afterDate(input.createdAt);
  const updatedAfter = afterDate(input.updatedAt);
  const filter: ReleaseNoteFilter = {
    title: input.query ? { containsIgnoreCase: input.query } : undefined,
    pipeline: pipeline ? { id: { eq: pipeline.id } } : undefined,
    release: release ? { id: { eq: release.id } } : undefined,
    createdAt: createdAfter ? { gte: createdAfter } : undefined,
    updatedAt: updatedAfter ? { gte: updatedAfter } : undefined,
  };
  const result = await collect(
    ({ first, after }) =>
      client().releaseNotes({
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
      result.nodes.map(async (note) => ({
        ...note,
        pipelineId: note.pipelineId,
        content: input.includeContent ? note.documentContent?.content : undefined,
        releases: input.includeReleases ? await note.releases : undefined,
      })),
    ),
  };
});
