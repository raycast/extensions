import { reportResult, resolveSource, type PostSource, type RenderingOptions } from "../lib/ai";
import { getEngine } from "../lib/renderer";

type Input = { source: PostSource; options?: RenderingOptions };

/** Inspect weighted character count, visible text, truncation, and layout without creating a PNG or saving a draft. */
export default async function inspectPost(input: Input) {
  const { post, options, warnings, source } = await resolveSource(input.source, input.options);
  const report = getEngine().explain(post, options);
  return {
    text: post.text,
    author: { name: post.author?.name ?? null, handle: post.author?.handle ?? null },
    options,
    report: reportResult(report),
    warnings: [...new Set([...warnings, ...report.warnings])],
    source: source ?? null,
  };
}
