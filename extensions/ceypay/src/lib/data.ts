import { Color, Icon, environment } from "@raycast/api";
import fs from "node:fs";
import path from "node:path";
import type { DocPage, DocsIndex, Endpoint, SecurityHeader } from "./types";

/**
 * The index ships inside the extension, so search is instant and works offline.
 * Regenerate it with `npm run build:index` whenever the docs repo changes.
 */
let cached: DocsIndex | undefined;

export function loadIndex(): DocsIndex {
  if (!cached) {
    const file = path.join(environment.assetsPath, "index.json");
    cached = JSON.parse(fs.readFileSync(file, "utf8")) as DocsIndex;
  }
  return cached;
}

export const METHOD_COLORS: Record<string, Color> = {
  GET: Color.Green,
  POST: Color.Blue,
  PUT: Color.Purple,
  PATCH: Color.Yellow,
  DELETE: Color.Red,
};

export function methodColor(method: string): Color {
  return METHOD_COLORS[method] ?? Color.SecondaryText;
}

/** CeyPay brand blue, sampled from `assets/icon.png`. Legible on both Raycast themes. */
export const BRAND = "#1C6EF5";

type PageIcon = { source: Icon; tintColor: Color.ColorLike };

/**
 * Doc groups get a brand-blue icon that hints at the kind of page; the few
 * non-doc tabs get their own colour so they stay distinguishable in a mixed list.
 */
const GROUP_ICONS: Record<string, PageIcon> = {
  "Getting Started": { source: Icon.Rocket, tintColor: BRAND },
  Guides: { source: Icon.Book, tintColor: BRAND },
  Reference: { source: Icon.BulletPoints, tintColor: BRAND },
  Integrate: { source: Icon.Plug, tintColor: BRAND },
  SDKs: { source: Icon.Code, tintColor: BRAND },
  WordPress: { source: Icon.Globe, tintColor: BRAND },
  Resources: { source: Icon.Folder, tintColor: BRAND },
};

const TAB_ICONS: Record<string, PageIcon> = {
  Changelog: { source: Icon.Clock, tintColor: Color.Orange },
  Support: { source: Icon.QuestionMarkCircle, tintColor: Color.Green },
  "API Reference": { source: Icon.Code, tintColor: BRAND },
};

export function pageIcon(page: DocPage): PageIcon {
  return GROUP_ICONS[page.group] ?? TAB_ICONS[page.tab] ?? { source: Icon.Document, tintColor: BRAND };
}

/** Splits a slug or path into searchable words so Raycast's filter matches partials. */
export function slugWords(value: string): string[] {
  return value
    .split(/[^A-Za-z0-9]+/)
    .filter((word) => word.length > 1)
    .map((word) => word.toLowerCase());
}

function fence(value: unknown): string {
  return ["```json", JSON.stringify(value, null, 2), "```"].join("\n");
}

/** Renders a full endpoint as Markdown for Raycast's detail pane. */
export function endpointMarkdown(endpoint: Endpoint): string {
  const parts: string[] = [`# ${endpoint.title}`, "", `\`${endpoint.method} ${endpoint.path}\``, ""];

  if (endpoint.description) {
    parts.push(endpoint.description, "");
  } else if (endpoint.summary) {
    parts.push(endpoint.summary, "");
  }

  if (endpoint.parameters.length > 0) {
    parts.push("## Parameters", "", "| Name | In | Type | Required | Description |", "| --- | --- | --- | --- | --- |");
    for (const p of endpoint.parameters) {
      const description = p.description.replace(/\r?\n/g, " ").replace(/\|/g, "\\|");
      parts.push(`| \`${p.name}\` | ${p.in} | ${p.type || "—"} | ${p.required ? "yes" : "no"} | ${description} |`);
    }
    parts.push("");
  }

  if (endpoint.requestExample !== undefined) {
    parts.push(
      `## Request body${endpoint.requestRequired ? " (required)" : ""}`,
      "",
      fence(endpoint.requestExample),
      "",
    );
  }

  if (endpoint.responses.length > 0) {
    parts.push("## Responses", "");
    for (const response of endpoint.responses) {
      parts.push(`**${response.status}** — ${response.description || "No description"}`, "");
      if (response.example !== undefined) parts.push(fence(response.example), "");
    }
  }

  return parts.join("\n");
}

/** Turns `x-api-key` into `YOUR_API_KEY` for a copy-paste-ready placeholder. */
function placeholderFor(header: string): string {
  return `YOUR_${header.replace(/^x-/i, "").replace(/-/g, "_").toUpperCase()}`;
}

/** Builds a runnable cURL command for an endpoint against the given server. */
export function endpointCurl(endpoint: Endpoint, serverUrl: string, headers: SecurityHeader[]): string {
  const lines = [`curl --request ${endpoint.method} \\`, `  --url '${serverUrl}${endpoint.path}' \\`];

  for (const header of headers) {
    lines.push(`  --header '${header.name}: ${placeholderFor(header.name)}' \\`);
  }

  if (endpoint.requestExample !== undefined) {
    lines.push("  --header 'Content-Type: application/json' \\");
    lines.push(`  --data '${JSON.stringify(endpoint.requestExample, null, 2)}'`);
  } else {
    // Drop the trailing continuation from the last header.
    lines[lines.length - 1] = lines[lines.length - 1].replace(/ \\$/, "");
  }

  return lines.join("\n");
}
