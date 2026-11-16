import { environment } from "@raycast/api";
import type { Post, Report } from "@xeet/core";
import { loadEngine } from "./engine";
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
export const getEngine = () => loadEngine(environment.assetsPath);

export async function renderContactSheet(post: Post, dpr: number): Promise<string> {
  await new Promise<void>((resolve) => setImmediate(resolve));
  const png = getEngine().sheet({ post, widths: [320, 390, 600], themes: ["light", "dark"], dpr });
  return writePreview(previewDirectory(), png);
}

export async function renderPost(
  post: Post,
  options: Options,
  warnings: string[] = [],
  source?: string,
): Promise<Preview> {
  await new Promise<void>((resolve) => setImmediate(resolve));
  const stablePost = { ...post, now: post.now || new Date().toISOString() };
  const { png, report } = getEngine().render(stablePost, options);
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
  await new Promise<void>((resolve) => setImmediate(resolve));
  const stablePost = { ...post, now: post.now || new Date().toISOString() };
  const rendered = getEngine().renderMany(stablePost, options);
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
