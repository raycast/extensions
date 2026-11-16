import { Clipboard } from "@raycast/api";
import type { Post, Report } from "@xeet/core";
import { createHash } from "node:crypto";
import { basename, join } from "node:path";
import { lstat } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { getEngine, type Preview } from "./renderer";
import { resolveInput } from "./resolver";
import { cacheDirectory, defaultOptions, previewDirectory, surfaces, type Options } from "./settings";
import { loadDraft, saveDraft } from "./storage";

export interface RenderingOptions {
  surface?: "web-timeline" | "web-detail" | "ios-timeline" | "ios-detail";
  theme?: "light" | "dark";
  /** Viewport width: 320, 390, or 600 CSS pixels. Defaults to the extension preference. */
  width?: number;
  /** Pixel density: 1, 2, or 3. 2 produces a PNG twice the viewport width. */
  dpr?: number;
  /** Show the full post instead of collapsing long text. */
  expanded?: boolean;
}

export interface PostSource {
  /** Exact plain text, a complete HTTPS X/Twitter post URL, or a serialized Xeet Post JSON object. */
  input?: string;
  /** An existing ID returned by list-drafts. Uses its saved content, attachments, and rendering options. */
  draftId?: string;
  /** Read clipboard text only when the user asks. Supply exactly one of input, draftId, or clipboard: true. */
  clipboard?: boolean;
  /** Replace only the text while preserving the source author and attachments, for example when editing a draft. */
  replacementText?: string;
}

export function renderingOptions(changes: RenderingOptions = {}, base = defaultOptions()): Options {
  const options = { ...base, ...changes };
  if (
    !Object.hasOwn(surfaces, options.surface) ||
    !["light", "dark"].includes(options.theme) ||
    ![320, 390, 600].includes(options.width) ||
    ![1, 2, 3].includes(options.dpr) ||
    typeof options.expanded !== "boolean"
  )
    throw new Error(
      "Unsupported rendering options. Use a listed surface, light/dark, width 320/390/600, and dpr 1/2/3.",
    );
  return options;
}

export async function resolveSource(source: PostSource, changes?: RenderingOptions) {
  if (
    [source.input !== undefined, source.draftId !== undefined, source.clipboard === true].filter(Boolean).length !== 1
  )
    throw new Error("Supply exactly one source: input, draftId, or clipboard: true.");
  const draft = source.draftId !== undefined ? await loadDraft(source.draftId) : undefined;
  const options = renderingOptions(changes, draft?.options);
  const input = source.clipboard ? await Clipboard.readText() : source.input;
  if (!draft && !input?.trim()) throw new Error("No text to render. Provide text, Post JSON, or a public X post URL.");
  const resolved = draft
    ? { post: draft.post, warnings: [] as string[], source: undefined }
    : await resolveInput(getEngine(), input!, options, cacheDirectory(), AbortSignal.timeout(20_000));
  const post =
    source.replacementText === undefined ? resolved.post : { ...resolved.post, text: source.replacementText };
  getEngine().explain(post, options);
  return { ...resolved, post, options };
}

// Whitelist JSON fields at the AI boundary. Never return engine models, buffers,
// Post media bytes, or file handles through Raycast's structured-clone channel.
export function reportResult(report: Report) {
  return {
    ruleset: report.ruleset,
    size: { width: report.size.width, height: report.size.height },
    length: { weighted: report.length.weighted, limit: report.length.limit, valid: report.length.valid },
    text: {
      lines: report.text.lines,
      truncated: report.text.truncated,
      hasShowMore: report.text.hasShowMore,
      showMore: report.text.showMore,
      visible: report.text.visible,
    },
    attachmentKind: report.attachment?.kind ?? null,
    warnings: [...report.warnings],
  };
}

export function imageResult(path: string) {
  return { previewId: basename(path, ".png").replace(/^xeet-/, ""), pngPath: path, fileUrl: pathToFileURL(path).href };
}

export function previewResult(preview: Preview) {
  return {
    ...imageResult(preview.path),
    pixelWidth: Math.ceil(preview.report.size.width * preview.options.dpr),
    pixelHeight: Math.ceil(preview.report.size.height * preview.options.dpr),
    options: { ...preview.options },
    report: reportResult(preview.report),
    warnings: [...preview.warnings],
    source: preview.source ?? null,
    typography: "Xeet's bundled fonts and emoji.",
  };
}

export async function previewPath(id: string) {
  if (!/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/.test(id))
    throw new Error("Use a previewId returned by a rendering tool.");
  const path = join(previewDirectory(), `xeet-${id}.png`);
  const stat = await lstat(path).catch(() => undefined);
  if (!stat?.isFile()) throw new Error("This preview is no longer available. Render it again before exporting.");
  return path;
}

export async function saveToolDraft(post: Post, options: Options, id?: string) {
  // Retries of a successful create must not add duplicate drafts.
  const hash = createHash("sha256").update(JSON.stringify({ post, options })).digest("hex");
  const stableId = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
  const saved = await saveDraft(post, options, id ?? stableId);
  return { id: saved.id, title: saved.title, savedAt: saved.savedAt };
}
