import { previewResult, resolveSource, type PostSource, type RenderingOptions } from "../lib/ai";
import { renderPost } from "../lib/renderer";

type Input = { source: PostSource; options?: RenderingOptions };

/** Render exact text, Post JSON, a public X URL, a saved draft, or explicitly requested clipboard text to a PNG. */
export default async function render(input: Input) {
  const { post, options, warnings, source } = await resolveSource(input.source, input.options);
  return previewResult(await renderPost(post, options, warnings, source));
}
