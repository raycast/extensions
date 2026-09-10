import { CleanTab } from "./clean";

export type FormatId =
  | "richText"
  | "markdown"
  | "html"
  | "url"
  | "title"
  | "titleUrl"
  | "titleUrlNewline"
  | "slack"
  | "jira"
  | "confluence"
  | "mediawiki"
  | "asciidoc"
  | "rst"
  | "org"
  | "bbcode"
  | "textile"
  | "latex"
  | "custom";

export interface FormatContext {
  titleUrlSeparator: string;
  customTemplate: string;
}

export interface FormatDefinition {
  id: FormatId;
  title: string;
  hint: string;
  /** Rich text formats put HTML on the clipboard instead of plain text. */
  rich?: boolean;
  render: (tab: CleanTab, context: FormatContext) => string;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Percent-encodes the characters that would otherwise end the link in the
 * target syntax. A URL containing `|` breaks Jira, one containing `]` breaks
 * Org and AsciiDoc, and so on. `%` is never touched, so existing escapes in
 * the address survive.
 */
function encodeUrl(url: string, characters: string): string {
  let encoded = url;
  for (const character of characters) {
    const replacement = `%${character.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`;
    encoded = encoded.split(character).join(replacement);
  }
  return encoded;
}

/** Replaces the characters that would close the link description too early. */
function safeTitle(title: string, replacements: Record<string, string>): string {
  let safe = title;
  for (const [from, to] of Object.entries(replacements)) {
    safe = safe.split(from).join(to);
  }
  return safe;
}

const LATEX_SPECIALS: Record<string, string> = {
  "\\": "\\textbackslash{}",
  "&": "\\&",
  "%": "\\%",
  $: "\\$",
  "#": "\\#",
  _: "\\_",
  "{": "\\{",
  "}": "\\}",
  "~": "\\textasciitilde{}",
  "^": "\\textasciicircum{}",
};

function latexTitle(title: string): string {
  let out = "";
  for (const character of title) {
    out += LATEX_SPECIALS[character] ?? character;
  }
  return out;
}

/** Inside \href the address only needs the TeX comment and macro characters escaped. */
function latexUrl(url: string): string {
  return url.replace(/([%#\\{}])/g, "\\$1");
}

function markdownLink(tab: CleanTab): string {
  const title = tab.title.replace(/([[\]])/g, "\\$1");
  const url = /[()\s]/.test(tab.url) ? `<${tab.url}>` : tab.url;
  return `[${title}](${url})`;
}

function htmlLink(tab: CleanTab): string {
  return `<a href="${escapeHtml(tab.url)}">${escapeHtml(tab.title)}</a>`;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function renderCustom(template: string, tab: CleanTab): string {
  const now = new Date();
  const tokens: Record<string, string> = {
    title: tab.title,
    url: tab.url,
    host: tab.host,
    domain: tab.domain,
    path: tab.path,
    scheme: tab.scheme,
    markdown: markdownLink(tab),
    html: htmlLink(tab),
    date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
  };
  return template.replace(/\{(\w+)\}/g, (match, token: string) =>
    Object.prototype.hasOwnProperty.call(tokens, token) ? tokens[token] : match,
  );
}

export const FORMATS: FormatDefinition[] = [
  {
    id: "richText",
    title: "Rich Text Link",
    hint: "Clickable text for Teams, Outlook, Word, Notes",
    rich: true,
    render: (tab) => htmlLink(tab),
  },
  {
    id: "markdown",
    title: "Markdown",
    hint: "[Title](URL)",
    render: (tab) => markdownLink(tab),
  },
  {
    id: "html",
    title: "HTML",
    hint: '<a href="URL">Title</a>',
    render: (tab) => htmlLink(tab),
  },
  {
    id: "url",
    title: "URL",
    hint: "The bare address",
    render: (tab) => tab.url,
  },
  {
    id: "title",
    title: "Title",
    hint: "The page title on its own",
    render: (tab) => tab.title,
  },
  {
    id: "titleUrl",
    title: "Title and URL",
    hint: "Title — URL",
    render: (tab, context) => `${tab.title}${context.titleUrlSeparator}${tab.url}`,
  },
  {
    id: "titleUrlNewline",
    title: "Title, URL on the Next Line",
    hint: "Two lines",
    render: (tab) => `${tab.title}\n${tab.url}`,
  },
  {
    id: "slack",
    title: "Slack",
    hint: "<URL|Title>",
    render: (tab) =>
      `<${encodeUrl(tab.url, "|<>")}|${safeTitle(tab.title, { "&": "&amp;", "<": "&lt;", ">": "&gt;", "|": "/" })}>`,
  },
  {
    id: "jira",
    title: "Jira",
    hint: "[Title|URL]",
    render: (tab) => `[${safeTitle(tab.title, { "[": "(", "]": ")", "|": "/" })}|${encodeUrl(tab.url, "|[]")}]`,
  },
  {
    id: "confluence",
    title: "Confluence Wiki",
    hint: "[Title|URL]",
    render: (tab) => `[${safeTitle(tab.title, { "[": "(", "]": ")", "|": "/" })}|${encodeUrl(tab.url, "|[]")}]`,
  },
  {
    id: "mediawiki",
    title: "MediaWiki",
    hint: "[URL Title]",
    render: (tab) => `[${encodeUrl(tab.url, "[] ")} ${safeTitle(tab.title, { "]": "&#93;" })}]`,
  },
  {
    id: "asciidoc",
    title: "AsciiDoc",
    hint: "URL[Title]",
    render: (tab) => `${encodeUrl(tab.url, "[] ")}[${safeTitle(tab.title, { "]": "\\]", ",": "\\," })}]`,
  },
  {
    id: "rst",
    title: "reStructuredText",
    hint: "`Title <URL>`_",
    render: (tab) => `\`${safeTitle(tab.title, { "`": "'", "<": "(", ">": ")" })} <${encodeUrl(tab.url, "<>")}>\`_`,
  },
  {
    id: "org",
    title: "Org Mode",
    hint: "[[URL][Title]]",
    render: (tab) => `[[${encodeUrl(tab.url, "[]")}][${safeTitle(tab.title, { "[": "(", "]": ")" })}]]`,
  },
  {
    id: "bbcode",
    title: "BBCode",
    hint: "[url=URL]Title[/url]",
    render: (tab) => `[url=${encodeUrl(tab.url, "[]")}]${safeTitle(tab.title, { "[": "(", "]": ")" })}[/url]`,
  },
  {
    id: "textile",
    title: "Textile",
    hint: '"Title":URL',
    render: (tab) => `"${safeTitle(tab.title, { '"': "&quot;" })}":${encodeUrl(tab.url, " ")}`,
  },
  {
    id: "latex",
    title: "LaTeX",
    hint: "\\href{URL}{Title}",
    render: (tab) => `\\href{${latexUrl(tab.url)}}{${latexTitle(tab.title)}}`,
  },
  {
    id: "custom",
    title: "Custom Format",
    hint: "Your own template from the preferences",
    render: (tab, context) => renderCustom(context.customTemplate, tab),
  },
];

export function getFormat(id: FormatId): FormatDefinition {
  return FORMATS.find((format) => format.id === id) ?? FORMATS[0];
}
