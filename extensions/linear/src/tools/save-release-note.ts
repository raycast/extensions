import {
  applyPatch,
  client,
  ContentPatch,
  resolveRelease,
  resolveReleaseNote,
  resolveReleasePipeline,
} from "./linearUtils";
import { serializeReleaseNote } from "./serializers";
import { withLinear } from "./withLinear";
type Input = {
  id?: string;
  pipeline?: string;
  title?: string;
  content?: string;
  patch?: {
    op: "replace" | "insert_before" | "insert_after" | "prepend" | "append" | "replace_range";
    old_string?: string;
    new_string?: string;
    replace_all?: boolean;
    anchor?: string;
    text?: string;
    from?: string;
    to?: string;
  }[];
  releases?: string[];
  rangeFromRelease?: string;
  rangeToRelease?: string;
};
async function releaseFields(input: Input) {
  return {
    releaseIds: input.releases
      ? await Promise.all(input.releases.map(async (id) => (await resolveRelease(id)).id))
      : undefined,
    rangeFromReleaseId: input.rangeFromRelease ? (await resolveRelease(input.rangeFromRelease)).id : undefined,
    rangeToReleaseId: input.rangeToRelease ? (await resolveRelease(input.rangeToRelease)).id : undefined,
  };
}
export default withLinear(async (input: Input) => {
  if (input.id) {
    if (input.content !== undefined && input.patch) throw new Error("Pass content or patch, not both.");
    const note = await resolveReleaseNote(input.id);
    const content = input.patch
      ? applyPatch(note.documentContent?.content ?? "", input.patch as ContentPatch[])
      : input.content;
    const result = await note.update({ title: input.title, content, ...(await releaseFields(input)) });
    const updated = result.success ? await result.releaseNote : undefined;
    if (!updated) throw new Error("Failed to update release notes.");
    return serializeReleaseNote(updated, { content: true });
  }
  if (!input.pipeline) throw new Error("pipeline is required when creating release notes.");
  if (!input.releases && !(input.rangeFromRelease && input.rangeToRelease))
    throw new Error("Provide releases or a complete release range.");
  if (input.patch) throw new Error("patch is only valid when updating release notes.");
  const pipeline = await resolveReleasePipeline(input.pipeline);
  const result = await client().createReleaseNote({
    pipelineId: pipeline.id,
    title: input.title,
    content: input.content,
    ...(await releaseFields(input)),
  });
  const created = result.success ? await result.releaseNote : undefined;
  if (!created) throw new Error("Failed to create release notes.");
  return serializeReleaseNote(created, { content: true });
});
