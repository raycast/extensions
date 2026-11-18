import { parse } from "node-html-parser";
import type { OpenGraph, SocialImage } from "./type";

export function resolveHttpUrl(value: string, baseUrl?: string): string | undefined {
  if (!value.trim()) return undefined;
  try {
    const url = new URL(value, baseUrl);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export function normalizeUrl(value: string): string {
  const input = value.trim();
  // Keep known non-HTTP schemes from being mistaken for a single-label host and port.
  const unsupportedScheme = /^(?:about|blob|data|file|ftp|ftps|javascript|mailto|tel|ws|wss):/i.test(input);
  if (!input || /\s/.test(input) || unsupportedScheme) throw new Error("Enter a valid HTTP or HTTPS URL.");
  const candidate = input.startsWith("//")
    ? `https:${input}`
    : /^[a-z][a-z\d+.-]*:/i.test(input) && !/^[a-z\d-]+(?:\.[a-z\d-]+)*:\d+(?:[/?#]|$)/i.test(input)
      ? input
      : `https://${input}`;
  const url = resolveHttpUrl(candidate);
  if (!url) throw new Error("Enter a valid HTTP or HTTPS URL.");
  return url;
}

function dimension(value: string): number | undefined {
  if (!/^\d+$/.test(value)) return undefined;
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : undefined;
}

export function parseOpenGraph(htmlText: string, pageUrl?: string): OpenGraph {
  const html = parse(htmlText);
  const baseUrl = resolveHttpUrl(html.querySelector("base[href]")?.getAttribute("href") ?? "", pageUrl) ?? pageUrl;
  const graph: OpenGraph = { title: html.querySelector("title")?.text.trim() || undefined, tags: [], images: [] };
  let ogImage: SocialImage | undefined;
  let twitterImage: SocialImage | undefined;

  for (const meta of html.querySelectorAll("meta")) {
    const property = meta.getAttribute("property")?.trim().toLowerCase();
    const name = meta.getAttribute("name")?.trim().toLowerCase();
    const content = meta.getAttribute("content")?.trim() ?? "";
    if (name === "description" && !graph.description) graph.description = content || undefined;
    for (const socialName of new Set([property, name])) {
      if (!socialName || (!socialName.startsWith("og:") && !socialName.startsWith("twitter:"))) continue;
      graph.tags.push({ name: socialName, content });

      if (["og:image", "og:image:url", "twitter:image", "twitter:image:src"].includes(socialName)) {
        const image: SocialImage = {
          source: socialName.startsWith("og:") ? "og" : "twitter",
          url: content,
          resolvedUrl: resolveHttpUrl(content, baseUrl),
        };
        graph.images.push(image);
        if (image.source === "og") ogImage = image;
        else twitterImage = image;
      } else {
        const image = socialName.startsWith("og:") ? ogImage : twitterImage;
        if (!image) continue;
        const suffix = socialName.replace(/^(og|twitter):image:/, "");
        if (suffix === "width" && image.width === undefined) image.width = dimension(content);
        if (suffix === "height" && image.height === undefined) image.height = dimension(content);
        if (suffix === "alt" && image.alt === undefined) image.alt = content;
      }
    }
  }
  return graph;
}

export function metadataValue(graph: OpenGraph, name: string): string | undefined {
  return graph.tags.find((tag) => tag.name === name && tag.content)?.content;
}

export function previewText(graph: OpenGraph) {
  return {
    title: metadataValue(graph, "og:title") ?? metadataValue(graph, "twitter:title") ?? graph.title,
    description:
      metadataValue(graph, "og:description") ?? metadataValue(graph, "twitter:description") ?? graph.description,
  };
}

export function validateOpenGraph(graph: OpenGraph): string[] {
  const issues: string[] = [];
  for (const name of ["og:title", "og:type", "og:image", "og:url"]) {
    // og:image:url is an alias for og:image in the Open Graph protocol.
    const tag = graph.tags.find((tag) => tag.name === name || (name === "og:image" && tag.name === "og:image:url"));
    if (!tag?.content) {
      issues.push(`Missing ${name}`);
    } else if ((name === "og:image" || name === "og:url") && !resolveHttpUrl(tag.content)) {
      issues.push(`${name} must be an absolute HTTP or HTTPS URL`);
    }
  }
  return issues;
}

export function escapeMarkdown(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/[\\`*_{}[\]()#!|]/g, "\\$&");
}

export function exportMarkdown(graph: OpenGraph, pageUrl: string): string {
  const { title, description } = previewText(graph);
  const rows = graph.tags.map(
    ({ name, content }) => `| ${escapeMarkdown(name)} | ${escapeMarkdown(content).replace(/\r?\n/g, "<br>")} |`,
  );
  return [
    `# ${escapeMarkdown(title ?? "Social metadata")}`,
    pageUrl,
    escapeMarkdown(description ?? ""),
    ["| Tag | Content |", "| --- | --- |", ...rows].join("\n"),
  ].join("\n\n");
}

export function exportHtml(graph: OpenGraph): string {
  const escape = (value: string) =>
    value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return graph.tags
    .map(
      ({ name, content }) =>
        `<meta ${name.startsWith("og:") ? "property" : "name"}="${escape(name)}" content="${escape(content)}">`,
    )
    .join("\n");
}
