import { Clipboard, Toast, getPreferenceValues, open, showToast } from "@raycast/api";
import { createPage, GistVisibility, updatePage } from "./github";
import { hostedUrl } from "./host";
import { renderMarkdownToHtml, Theme } from "./render";
import { wrapHtmlFragment, InputKind } from "./html";

export type PublishInput = {
  kind: InputKind;
  /** The raw source the user authored (markdown text, or html source). */
  source: string;
  /** Optional pre-rendered HTML; if absent, will be derived from source. */
  preRenderedHtml?: string;
  description: string;
  visibility: GistVisibility;
  theme: Theme;
  /** Filename to use for the user's original source when kind === "markdown". Default "source.md". */
  sourceFilename?: string;
};

export type PublishResult = {
  id: string;
  url: string;
  htmlUrl: string;
};

export async function publish(input: PublishInput): Promise<PublishResult> {
  const { files } = await buildFiles(input);
  const { id, htmlUrl } = await createPage({
    description: input.description,
    visibility: input.visibility,
    files,
  });
  return { id, url: hostedUrl(id), htmlUrl };
}

export async function republish(
  id: string,
  input: PublishInput,
  opts: { previousFiles?: string[] } = {},
): Promise<PublishResult> {
  const { files } = await buildFiles(input);
  const incoming = new Set(files.map((f) => f.filename));
  const removeFiles = (opts.previousFiles ?? []).filter((f) => !incoming.has(f));
  await updatePage({ id, description: input.description, files, removeFiles });
  return { id, url: hostedUrl(id), htmlUrl: `https://gist.github.com/${id}` };
}

async function buildFiles(input: PublishInput) {
  let html: string;
  const files: { filename: string; content: string }[] = [];

  if (input.kind === "markdown") {
    html =
      input.preRenderedHtml ??
      (await renderMarkdownToHtml(input.source, { theme: input.theme, title: input.description }));
    files.push({ filename: "index.html", content: html });
    files.push({ filename: input.sourceFilename ?? "source.md", content: input.source });
  } else {
    html = input.preRenderedHtml ?? wrapHtmlFragment(input.source, input.description);
    files.push({ filename: "index.html", content: html });
  }

  return { html, files };
}

export async function afterPublish(result: PublishResult, label = "Page published") {
  const prefs = getPreferenceValues<Preferences>();
  await showToast({
    style: Toast.Style.Success,
    title: label,
    message: result.url,
    primaryAction: {
      title: "Open in Browser",
      shortcut: { modifiers: ["cmd"], key: "o" },
      onAction: () => open(result.url),
    },
    secondaryAction: {
      title: "Copy URL",
      shortcut: { modifiers: ["cmd", "shift"], key: "c" },
      onAction: () => Clipboard.copy(result.url),
    },
  });
  if (prefs.copyUrlAfterPublish) await Clipboard.copy(result.url);
  if (prefs.autoOpenAfterPublish) await open(result.url);
}
