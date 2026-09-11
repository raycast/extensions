import { withAccessToken } from "@raycast/utils";

import { linear } from "../api/linearClient";

import { client, resolveRelease, resolveReleasePipeline } from "./linearUtils";

function date(value?: string): Date | null | undefined {
  return value === "null" ? null : value === undefined ? undefined : new Date(value);
}

function nullable(value?: string): string | null | undefined {
  return value === "null" ? null : value;
}

type Input = {
  id?: string;
  name?: string;
  description?: string;
  version?: string;
  pipeline?: string;
  stage?: string;
  /** Estimated start date, or the literal string "null" to remove it. */
  startDate?: string;
  /** Estimated completion date, or the literal string "null" to remove it. */
  targetDate?: string;
  createdAt?: string;
  /** Started timestamp, or the literal string "null" to remove it. */
  startedAt?: string;
  /** Completed timestamp, or the literal string "null" to remove it. */
  completedAt?: string;
  commitSha?: string;
};
async function resolveStage(pipelineId: string, query?: string) {
  if (!query) return undefined;
  const stages = (await (await client().releasePipeline(pipelineId)).stages({ first: 250 })).nodes;
  const normalized = query.toLowerCase();
  const stage = stages.find(
    (item) => item.id === query || item.name.toLowerCase() === normalized || item.type === normalized,
  );
  if (!stage) throw new Error(`No release stage found for "${query}".`);
  return stage.id;
}
export default withAccessToken(linear)(async (input: Input) => {
  if (input.id) {
    const release = await resolveRelease(input.id);
    if (input.pipeline) {
      const pipeline = await resolveReleasePipeline(input.pipeline);
      if (pipeline.id !== release.pipelineId)
        throw new Error("Changing a release pipeline is not supported by Linear.");
    }
    if (!release.pipelineId) throw new Error("Release has no pipeline.");
    const result = await release.update({
      name: input.name,
      description: input.description,
      version: input.version,
      stageId: await resolveStage(release.pipelineId, input.stage),
      startDate: nullable(input.startDate),
      targetDate: nullable(input.targetDate),
      startedAt: date(input.startedAt),
      completedAt: date(input.completedAt),
      commitSha: input.commitSha,
    });
    return result.release;
  }
  if (!input.name || !input.pipeline) throw new Error("name and pipeline are required when creating a release.");
  const pipeline = await resolveReleasePipeline(input.pipeline);
  const result = await client().createRelease({
    name: input.name,
    pipelineId: pipeline.id,
    description: input.description,
    version: input.version,
    stageId: await resolveStage(pipeline.id, input.stage),
    startDate: nullable(input.startDate),
    targetDate: nullable(input.targetDate),
    createdAt: date(input.createdAt),
    startedAt: date(input.startedAt),
    completedAt: date(input.completedAt),
    commitSha: input.commitSha,
  });
  return result.release;
});
