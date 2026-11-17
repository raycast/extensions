import { environment } from "@raycast/api";
import type { Post, Report } from "@xeet/core";
import { loadEngine, type Engine } from "./engine";
import { writePreview } from "./files";
import { previewDirectory, type Options } from "./settings";

export interface Preview {
  path: string;
  post: Post;
  options: Options;
  report: Report;
  warnings: string[];
  source?: string;
}
let engine: Engine | undefined;
export function getEngine(): Engine {
  return (engine ??= loadEngine(environment.assetsPath));
}

export async function renderContactSheet(post: Post, dpr: number): Promise<string> {
  const png = await getEngine().sheet({ post, widths: [320, 390, 600], themes: ["light", "dark"], dpr });
  return writePreview(previewDirectory(), png);
}

export async function renderPost(
  post: Post,
  options: Options,
  warnings: string[] = [],
  source?: string,
): Promise<Preview> {
  const stablePost = { ...post, now: post.now || new Date().toISOString() };
  const { png, report } = await getEngine().render(stablePost, options);
  return {
    path: await writePreview(previewDirectory(), png),
    post: stablePost,
    options,
    report,
    warnings: [...new Set([...warnings, ...report.warnings])],
    source,
  };
}

export async function renderVariants(post: Post, options: Options[]): Promise<Preview[]> {
  const stablePost = { ...post, now: post.now || new Date().toISOString() };
  const rendered = await getEngine().renderMany(stablePost, options);
  return Promise.all(
    rendered.map(async ({ png, report }, index) => ({
      path: await writePreview(previewDirectory(), png),
      post: stablePost,
      options: options[index],
      report,
      warnings: report.warnings,
    })),
  );
}
