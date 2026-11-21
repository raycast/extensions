/**
 * Hand-written scanner for Raycast's dynamic placeholder syntax
 * (https://manual.raycast.com/dynamic-placeholders, read 2026-11-02).
 *
 * Grammar, where whitespace outside quotes means spaces and tabs only:
 *   placeholder := "{" ws* name (ws+ attribute)* (ws* "|" ws* modifier)* ws* "}"
 *   attribute   := key "=" ( '"' any* '"' | "'" any* "'" | bare )
 *
 * Anything else stays literal text, which is what keeps JSON examples in prompts intact. Raycast documents no
 * escape syntax, so there is none here.
 *
 * No regex runs over the template: a failed attempt only moves one character on, so each attempt is capped and all
 * failed attempts share a budget proportional to the input. Crafted input therefore stays linear. Once the budget is
 * spent the rest is plain text, and a prompt that loses its input placeholder that way fails safely at render time.
 */

export const MODIFIERS = ["uppercase", "lowercase", "trim", "json-stringify", "raw", "percent-encode"] as const;
export type ModifierName = (typeof MODIFIERS)[number];

export type DateKind = "date" | "time" | "datetime" | "day";
export type BrowserTabFormat = "markdown" | "text" | "html";
export type PlaceholderKind = "selection" | "clipboard" | "argument" | "snippet" | "browser-tab" | DateKind;

const DATE_ATTRIBUTES = ["offset", "format", "locale"] as const;

/** Attributes each placeholder accepts. Anything else is a blocking error at save time. */
export const ALLOWED_ATTRIBUTES: Readonly<Record<PlaceholderKind, readonly string[]>> = {
  selection: [],
  clipboard: ["offset"],
  argument: ["name", "default", "options"],
  snippet: ["name"],
  "browser-tab": ["format", "selector"],
  date: DATE_ATTRIBUTES,
  time: DATE_ATTRIBUTES,
  datetime: DATE_ATTRIBUTES,
  day: DATE_ATTRIBUTES,
};

/** `Clipboard.readText` accepts offsets up to this value. */
export const MAX_CLIPBOARD_OFFSET = 5;

/** No sensible attribute list gets near this, so longer candidates are treated as text. */
const MAX_PLACEHOLDER_LENGTH = 4096;

export interface PlaceholderAttribute {
  key: string;
  value: string;
}

interface Span {
  /** Exact source text, used to leave unknown braces unchanged. */
  raw: string;
  start: number;
  end: number;
}

export interface TextNode extends Span {
  type: "text";
}

/** `{word}` or `{word attr=…}` with an unknown word: probably a typo, kept as text but worth a hint. */
export interface UnknownNode extends Span {
  type: "unknown";
  name: string;
}

interface PlaceholderBase extends Span {
  type: "placeholder";
  attributes: PlaceholderAttribute[];
  /** In source order. Unknown names stay in the list so validation can report them. */
  modifiers: string[];
}

export interface SelectionNode extends PlaceholderBase {
  kind: "selection";
}

export interface ClipboardNode extends PlaceholderBase {
  kind: "clipboard";
  /** 0 when absent. A malformed attribute also yields 0 and is reported by validation. */
  offset: number;
}

export interface ArgumentNode extends PlaceholderBase {
  kind: "argument";
  name?: string;
  default?: string;
  options?: string[];
}

export interface SnippetNode extends PlaceholderBase {
  kind: "snippet";
  name?: string;
}

export interface BrowserTabNode extends PlaceholderBase {
  kind: "browser-tab";
  /** Undefined when absent or not one of the three formats. */
  format?: BrowserTabFormat;
  selector?: string;
}

export interface DateNode extends PlaceholderBase {
  kind: DateKind;
  offset?: string;
  format?: string;
  locale?: string;
}

export type PlaceholderNode = SelectionNode | ClipboardNode | ArgumentNode | SnippetNode | BrowserTabNode | DateNode;
export type TemplateNode = TextNode | UnknownNode | PlaceholderNode;

export function isInputPlaceholder(node: TemplateNode): node is SelectionNode | ClipboardNode | BrowserTabNode {
  return (
    node.type === "placeholder" &&
    (node.kind === "selection" || node.kind === "clipboard" || node.kind === "browser-tab")
  );
}

export function placeholdersOf(nodes: readonly TemplateNode[]): PlaceholderNode[] {
  return nodes.filter((node): node is PlaceholderNode => node.type === "placeholder");
}

export function getAttribute(node: PlaceholderNode, key: string): string | undefined {
  return node.attributes.find((attribute) => attribute.key === key)?.value;
}

function isBlank(code: number): boolean {
  return code === 32 || code === 9;
}

function isNameStart(code: number): boolean {
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

function isNameChar(code: number): boolean {
  return isNameStart(code) || (code >= 48 && code <= 57) || code === 45 || code === 95;
}

interface Candidate {
  name: string;
  attributes: PlaceholderAttribute[];
  modifiers: string[];
  /** Index just past the closing brace. */
  end: number;
}

/** Scans one candidate. `scanned` reports how far it read, which is what failed attempts pay from the budget. */
class CandidateScanner {
  private pos: number;
  private readonly limit: number;

  constructor(
    private readonly text: string,
    start: number,
  ) {
    this.pos = start + 1;
    this.limit = Math.min(text.length, start + MAX_PLACEHOLDER_LENGTH);
  }

  get position(): number {
    return this.pos;
  }

  private code(): number {
    return this.pos < this.limit ? this.text.charCodeAt(this.pos) : -1;
  }

  private skipBlanks(): boolean {
    const from = this.pos;
    while (isBlank(this.code())) this.pos += 1;
    return this.pos > from;
  }

  private readName(): string | undefined {
    if (!isNameStart(this.code())) return undefined;
    const from = this.pos;
    while (isNameChar(this.code())) this.pos += 1;
    return this.text.slice(from, this.pos);
  }

  private readValue(): string | undefined {
    const quote = this.code();
    if (quote === 34 || quote === 39) {
      const from = this.pos + 1;
      const close = this.text.indexOf(String.fromCharCode(quote), from);
      if (close === -1 || close >= this.limit) {
        this.pos = this.limit;
        return undefined;
      }
      this.pos = close + 1;
      return this.text.slice(from, close);
    }
    const from = this.pos;
    for (let code = this.code(); code !== -1; code = this.code()) {
      // Newlines, quotes and braces end a bare value, otherwise prose after an `=` would be swallowed.
      if (isBlank(code) || code === 10 || code === 13 || code === 34 || code === 39) break;
      if (code === 123 || code === 124 || code === 125) break;
      this.pos += 1;
    }
    return this.pos > from ? this.text.slice(from, this.pos) : undefined;
  }

  private readAttributes(attributes: PlaceholderAttribute[]): boolean {
    for (;;) {
      const hadBlanks = this.skipBlanks();
      // Not an attribute: the caller reads the modifiers or the closing brace.
      if (!hadBlanks || !isNameStart(this.code())) return true;
      const key = this.readName();
      if (key === undefined || this.code() !== 61) return false;
      this.pos += 1;
      const value = this.readValue();
      if (value === undefined) return false;
      attributes.push({ key, value });
    }
  }

  scan(): Candidate | undefined {
    this.skipBlanks();
    const name = this.readName();
    if (name === undefined) return undefined;

    const attributes: PlaceholderAttribute[] = [];
    if (!this.readAttributes(attributes)) return undefined;

    const modifiers: string[] = [];
    this.skipBlanks();
    while (this.code() === 124) {
      this.pos += 1;
      this.skipBlanks();
      const modifier = this.readName();
      if (modifier === undefined) return undefined;
      modifiers.push(modifier);
      this.skipBlanks();
    }

    if (this.code() !== 125) return undefined;
    return { name, attributes, modifiers, end: this.pos + 1 };
  }
}

function parseClipboardOffset(value: string | undefined): number {
  return value !== undefined && /^\d{1,3}$/.test(value) ? Number(value) : 0;
}

function parseOptions(value: string | undefined): string[] | undefined {
  if (value === undefined) return undefined;
  const options = value
    .split(",")
    .map((option) => option.trim())
    .filter((option) => option.length > 0);
  return options.length > 0 ? options : undefined;
}

function parseBrowserFormat(value: string | undefined): BrowserTabFormat | undefined {
  return value === "markdown" || value === "text" || value === "html" ? value : undefined;
}

function toNode(candidate: Candidate, start: number, text: string): TemplateNode {
  const { name, attributes, modifiers, end } = candidate;
  const raw = text.slice(start, end);
  const base = { type: "placeholder" as const, raw, start, end, attributes, modifiers };
  const attribute = (key: string) => attributes.find((entry) => entry.key === key)?.value;

  switch (name) {
    case "selection":
      return { ...base, kind: "selection" };
    case "clipboard":
      return { ...base, kind: "clipboard", offset: parseClipboardOffset(attribute("offset")) };
    case "argument":
      return {
        ...base,
        kind: "argument",
        name: attribute("name"),
        default: attribute("default"),
        options: parseOptions(attribute("options")),
      };
    case "snippet":
      return { ...base, kind: "snippet", name: attribute("name") };
    case "browser-tab":
      return {
        ...base,
        kind: "browser-tab",
        format: parseBrowserFormat(attribute("format")),
        selector: attribute("selector") || undefined,
      };
    case "date":
    case "time":
    case "datetime":
    case "day":
      return {
        ...base,
        kind: name,
        offset: attribute("offset"),
        format: attribute("format"),
        locale: attribute("locale"),
      };
    default:
      return { type: "unknown", name, raw, start, end };
  }
}

export function parseTemplate(template: string): TemplateNode[] {
  const nodes: TemplateNode[] = [];
  let textStart = 0;
  let cursor = 0;
  let budget = template.length * 8 + MAX_PLACEHOLDER_LENGTH;

  const flushText = (end: number) => {
    if (end > textStart) {
      nodes.push({ type: "text", raw: template.slice(textStart, end), start: textStart, end });
    }
  };

  while (budget > 0) {
    const open = template.indexOf("{", cursor);
    if (open === -1) break;

    const scanner = new CandidateScanner(template, open);
    const candidate = scanner.scan();
    if (candidate === undefined) {
      budget -= scanner.position - open;
      cursor = open + 1;
      continue;
    }

    flushText(open);
    nodes.push(toNode(candidate, open, template));
    cursor = candidate.end;
    textStart = candidate.end;
  }

  flushText(template.length);
  return nodes;
}
