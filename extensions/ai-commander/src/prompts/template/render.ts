/**
 * Fills a template in a single pass. Inserted values are never parsed again, so a selection containing `{clipboard}`
 * cannot pull in anything else.
 *
 * Fencing decisions:
 * - Selection, clipboard, browser tab and arguments are fenced with `"""` (Raycast: "AI Commands wrap placeholder
 *   values in triple quotes"). The fence sits on its own lines: inline, a value ending in `"` would merge with the
 *   closing quotes, and only a whole line can end the block.
 * - Snippets are authored instructions, so they are inserted raw: no fence, no placeholder expansion. A snippet
 *   therefore cannot pull in another snippet at all, which is stricter than Raycast's rule and needs no recursion
 *   guard. Unlike Raycast, `{clipboard}` inside a snippet stays literal; `validateSnippetText` hints at that.
 * - Date values are generated here, not user content, so they read naturally in a sentence without a fence.
 * - Empty values drop the placeholder without a fence, as Raycast does for an empty clipboard.
 */

import { wellFormed } from "../../core/text";
import { formatDatePlaceholder } from "./date";
import {
  MAX_CLIPBOARD_OFFSET,
  isInputPlaceholder,
  parseTemplate,
  placeholdersOf,
  type ArgumentNode,
  type BrowserTabFormat,
  type BrowserTabNode,
  type PlaceholderNode,
  type TemplateNode,
} from "./parser";
import { validateNodes } from "./validate";

export type RenderErrorCode = "empty-input" | "missing-argument" | "unknown-snippet" | "invalid-template";

/** `message` is safe to show and never contains input values. */
export class RenderError extends Error {
  constructor(
    readonly code: RenderErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "RenderError";
  }
}

export interface ArgumentRequirement {
  /** Field identity: the name, or `argument`, `argument2`, … for unnamed placeholders. */
  key: string;
  /** Unnamed arguments are each their own field. */
  named: boolean;
  default?: string;
  options?: string[];
  required: boolean;
}

export interface BrowserTabRequirement {
  /** Pass the content in `RenderValues.browserTab` under this key. */
  key: string;
  format: BrowserTabFormat;
  selector?: string;
}

export interface TemplateRequirements {
  selection: boolean;
  /** Unique, in order of first use. Out-of-range offsets are left out; validation rejects them. */
  clipboardOffsets: number[];
  browserTabs: BrowserTabRequirement[];
  /** One entry per unique argument. */
  arguments: ArgumentRequirement[];
  /** Unique snippet names. */
  snippets: string[];
}

export interface RenderValues {
  selection?: string;
  /** By offset. */
  clipboard?: Readonly<Record<number, string | undefined>>;
  /** By `BrowserTabRequirement.key`. */
  browserTab?: Readonly<Record<string, string | undefined>>;
  /** By `ArgumentRequirement.key`. */
  arguments?: Readonly<Record<string, string | undefined>>;
  snippets?: readonly { name: string; text: string }[];
  /** Fixed clock for tests and for refinement rounds that should keep their date. */
  now?: Date;
}

/** With a selector the API rejects markdown, so the default changes to text. */
function browserFormat(node: BrowserTabNode): BrowserTabFormat {
  return node.format ?? (node.selector !== undefined ? "text" : "markdown");
}

function browserKey(format: BrowserTabFormat, selector: string | undefined): string {
  return selector === undefined ? format : `${format}:${selector}`;
}

/** Same name means same value. Each unnamed placeholder is its own value. */
function argumentKeys(nodes: readonly PlaceholderNode[]): Map<ArgumentNode, string> {
  const argumentNodes = nodes.filter((node): node is ArgumentNode => node.kind === "argument");
  const taken = new Set(argumentNodes.flatMap((node) => (node.name ? [node.name] : [])));
  const keys = new Map<ArgumentNode, string>();
  let counter = 1;
  for (const node of argumentNodes) {
    if (node.name) {
      keys.set(node, node.name);
      continue;
    }
    let key = counter === 1 ? "argument" : `argument${counter}`;
    while (taken.has(key)) {
      counter += 1;
      key = `argument${counter}`;
    }
    counter += 1;
    taken.add(key);
    keys.set(node, key);
  }
  return keys;
}

export function extractRequirements(template: string): TemplateRequirements {
  const placeholders = placeholdersOf(parseTemplate(template));
  const keys = argumentKeys(placeholders);
  const clipboardOffsets = new Set<number>();
  const browserTabs = new Map<string, BrowserTabRequirement>();
  const argumentsByKey = new Map<string, ArgumentRequirement>();
  const snippets = new Set<string>();
  let selection = false;

  for (const node of placeholders) {
    switch (node.kind) {
      case "selection":
        selection = true;
        break;
      case "clipboard":
        if (node.offset <= MAX_CLIPBOARD_OFFSET) clipboardOffsets.add(node.offset);
        break;
      case "browser-tab": {
        const format = browserFormat(node);
        const key = browserKey(format, node.selector);
        browserTabs.set(key, { key, format, selector: node.selector });
        break;
      }
      case "argument": {
        const key = keys.get(node) ?? "argument";
        const known = argumentsByKey.get(key);
        // Repeats of a name may carry the default or options only once, so fill gaps instead of overwriting.
        const merged = { default: known?.default ?? node.default, options: known?.options ?? node.options };
        argumentsByKey.set(key, { key, named: Boolean(node.name), ...merged, required: merged.default === undefined });
        break;
      }
      case "snippet":
        if (node.name) snippets.add(node.name);
        break;
      default:
        break;
    }
  }

  return {
    selection,
    clipboardOffsets: [...clipboardOffsets],
    browserTabs: [...browserTabs.values()],
    arguments: [...argumentsByKey.values()],
    snippets: [...snippets],
  };
}

/** The fence is always longer than the longest quote run in the value, so the value cannot close it. */
export function fenceValue(value: string): string {
  let longest = 0;
  let run = 0;
  for (let index = 0; index < value.length; index += 1) {
    run = value.charCodeAt(index) === 34 ? run + 1 : 0;
    if (run > longest) longest = run;
  }
  const fence = '"'.repeat(longest >= 3 ? longest + 1 : 3);
  return `${fence}\n${value}\n${fence}`;
}

function applyModifiers(value: string, modifiers: readonly string[]): string {
  let result = value;
  for (const modifier of modifiers) {
    switch (modifier) {
      case "uppercase":
        result = result.toUpperCase();
        break;
      case "lowercase":
        result = result.toLowerCase();
        break;
      case "trim":
        result = result.trim();
        break;
      case "json-stringify":
        result = JSON.stringify(result);
        break;
      case "percent-encode":
        result = encodeURIComponent(wellFormed(result));
        break;
      default:
        // `raw` is handled by the caller. Unknown names never get here because validation blocks them.
        break;
    }
  }
  return result;
}

/** Guards against `name="__proto__"` reading from Object.prototype. */
function lookup(record: Readonly<Record<string, string | undefined>> | undefined, key: string): string | undefined {
  if (!record || !Object.hasOwn(record, key)) return undefined;
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

function resolveArgument(key: string, values: RenderValues, defaults: ReadonlyMap<string, string>): string {
  const provided = lookup(values.arguments, key);
  if (provided) return provided;
  const fallback = defaults.get(key);
  if (fallback !== undefined) return fallback;
  throw new RenderError("missing-argument", `Argument "${key}" needs a value.`);
}

function resolveInput(node: TemplateNode, values: RenderValues): string | undefined {
  if (node.type !== "placeholder") return undefined;
  if (node.kind === "selection") return values.selection;
  if (node.kind === "clipboard") return values.clipboard?.[node.offset];
  if (node.kind === "browser-tab") return lookup(values.browserTab, browserKey(browserFormat(node), node.selector));
  return undefined;
}

function fenced(value: string, modifiers: readonly string[]): string {
  const result = applyModifiers(value, modifiers);
  if (result === "") return "";
  return modifiers.includes("raw") ? result : fenceValue(result);
}

/**
 * Throws `RenderError`. Runs the save-time checks again because imported prompts may never have passed the form, and
 * a template with no usable input must never reach a model.
 */
export function render(template: string, values: RenderValues = {}): string {
  const nodes = parseTemplate(template);
  const snippets = new Map((values.snippets ?? []).map((snippet) => [snippet.name, snippet.text]));
  const validation = validateNodes(nodes, { snippetNames: [...snippets.keys()] });
  const firstError = validation.errors[0];
  if (firstError) {
    const code =
      firstError.code === "missing-input"
        ? "empty-input"
        : firstError.code === "unknown-snippet"
          ? "unknown-snippet"
          : "invalid-template";
    throw new RenderError(code, firstError.message);
  }

  const hasContent = nodes.some((node) => isInputPlaceholder(node) && (resolveInput(node, values) ?? "").trim() !== "");
  if (!hasContent) {
    throw new RenderError(
      "empty-input",
      "There is no input to process: selection, clipboard, and browser tab are empty.",
    );
  }

  const keys = argumentKeys(placeholdersOf(nodes));
  // Repeats of a name share one form field, so the first default given anywhere applies to all of them.
  const defaults = new Map<string, string>();
  for (const [node, key] of keys) {
    if (node.default !== undefined && !defaults.has(key)) defaults.set(key, node.default);
  }
  const now = values.now ?? new Date();

  return nodes
    .map((node) => {
      if (node.type !== "placeholder") return node.raw;
      switch (node.kind) {
        case "selection":
        case "clipboard":
        case "browser-tab":
          return fenced(resolveInput(node, values) ?? "", node.modifiers);
        case "argument":
          return fenced(resolveArgument(keys.get(node) ?? "argument", values, defaults), node.modifiers);
        case "snippet":
          return applyModifiers(snippets.get(node.name ?? "") ?? "", node.modifiers);
        default:
          return applyModifiers(formatDatePlaceholder(node.kind, now, node), node.modifiers);
      }
    })
    .join("");
}
