/**
 * Save-time checks in three tiers: blocking errors, non-blocking hints, and silence for everything else in braces (JSON
 * examples, for instance). Pure, so the form and the import share it.
 */

import type { OutputMode } from "../../core/types";
import { formatDatePlaceholder, isValidLocale, parseDateFormat, parseDateOffset } from "./date";
import {
  ALLOWED_ATTRIBUTES,
  MAX_CLIPBOARD_OFFSET,
  MODIFIERS,
  getAttribute,
  isInputPlaceholder,
  parseTemplate,
  placeholdersOf,
  type PlaceholderNode,
  type TemplateNode,
} from "./parser";

export type IssueCode =
  | "missing-input"
  | "unknown-attribute"
  | "unknown-modifier"
  | "duplicate-attribute"
  | "invalid-clipboard-offset"
  | "invalid-browser-format"
  | "selector-markdown"
  | "missing-snippet-name"
  | "unknown-snippet"
  | "nested-snippet"
  | "invalid-date-offset"
  | "invalid-date-format"
  | "invalid-locale"
  | "output-requires-selection"
  | "highlight-requires-selection"
  | "unknown-placeholder"
  | "unsupported-placeholder"
  | "too-many-arguments"
  | "snippet-placeholder-literal";

export interface TemplateIssue {
  code: IssueCode;
  message: string;
  /** Source text of the offending placeholder, when there is one. */
  placeholder?: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: TemplateIssue[];
  hints: TemplateIssue[];
}

export interface ValidateOptions {
  /** Known snippet names. When omitted, snippet existence is not checked. */
  snippetNames?: readonly string[];
}

export interface PromptDraft {
  template: string;
  output: OutputMode;
  highlightChanges: boolean;
}

/** Raycast caps distinct arguments at 3. The extension does not need the cap but warns from the fourth on. */
const ARGUMENT_HINT_THRESHOLD = 4;

/**
 * Raycast placeholders that are deliberately left out: `{cursor}` and `{uuid}` are meant for snippets and quicklinks,
 * and `{calculator}` would need an expression evaluator for little use in prompts.
 */
const UNSUPPORTED = new Set(["calculator", "cursor", "uuid"]);

const SELECTION_OUTPUTS: readonly OutputMode[] = ["preview", "replace", "copy", "insertAfter"];
const NO_SELECTION_OUTPUTS: readonly OutputMode[] = ["preview", "copy"];

function checkAttributes(node: PlaceholderNode, errors: TemplateIssue[]): void {
  const allowed = ALLOWED_ATTRIBUTES[node.kind];
  const seen = new Set<string>();
  for (const { key } of node.attributes) {
    if (!allowed.includes(key)) {
      errors.push({
        code: "unknown-attribute",
        message: `{${node.kind}} has no attribute "${key}".`,
        placeholder: node.raw,
      });
    } else if (seen.has(key)) {
      errors.push({
        code: "duplicate-attribute",
        message: `Attribute "${key}" appears twice.`,
        placeholder: node.raw,
      });
    }
    seen.add(key);
  }
}

function checkModifiers(node: PlaceholderNode, errors: TemplateIssue[]): void {
  for (const modifier of node.modifiers) {
    if (!(MODIFIERS as readonly string[]).includes(modifier)) {
      errors.push({
        code: "unknown-modifier",
        message: `Unknown modifier "${modifier}". Use one of: ${MODIFIERS.join(", ")}.`,
        placeholder: node.raw,
      });
    }
  }
}

function checkClipboardOffset(node: PlaceholderNode, errors: TemplateIssue[]): void {
  const offset = getAttribute(node, "offset");
  if (offset === undefined) return;
  if (!/^\d+$/.test(offset) || Number(offset) > MAX_CLIPBOARD_OFFSET) {
    errors.push({
      code: "invalid-clipboard-offset",
      message: `Clipboard offset must be a whole number from 0 to ${MAX_CLIPBOARD_OFFSET}.`,
      placeholder: node.raw,
    });
  }
}

function checkBrowserTab(node: PlaceholderNode, errors: TemplateIssue[]): void {
  if (node.kind !== "browser-tab") return;
  const format = getAttribute(node, "format");
  if (format !== undefined && node.format === undefined) {
    errors.push({
      code: "invalid-browser-format",
      message: "Browser tab format must be markdown, text, or html.",
      placeholder: node.raw,
    });
  }
  if (node.selector !== undefined && node.format === "markdown") {
    errors.push({
      code: "selector-markdown",
      message: 'A selector cannot be combined with format="markdown". Use text or html.',
      placeholder: node.raw,
    });
  }
}

function checkSnippet(node: PlaceholderNode, options: ValidateOptions, errors: TemplateIssue[]): void {
  if (node.kind !== "snippet") return;
  if (!node.name) {
    errors.push({
      code: "missing-snippet-name",
      message: 'A snippet needs a name, for example {snippet name="Signature"}.',
      placeholder: node.raw,
    });
  } else if (options.snippetNames && !options.snippetNames.includes(node.name)) {
    errors.push({ code: "unknown-snippet", message: `Snippet "${node.name}" does not exist.`, placeholder: node.raw });
  }
}

function checkDate(node: PlaceholderNode, errors: TemplateIssue[]): void {
  if (node.kind !== "date" && node.kind !== "time" && node.kind !== "datetime" && node.kind !== "day") return;
  const placeholder = node.raw;
  const before = errors.length;

  if (node.offset !== undefined && !parseDateOffset(node.offset)) {
    errors.push({
      code: "invalid-date-offset",
      message: 'Date offset must look like "+3d" or "-2M +1h". Units: m, h, d, M, y.',
      placeholder,
    });
  }
  if (node.format !== undefined && !parseDateFormat(node.format)) {
    errors.push({
      code: "invalid-date-format",
      message: "Unsupported date format. Use letters y, M, d, E, a, H, h, m, s, S and quote literal text.",
      placeholder,
    });
  }
  if (node.locale !== undefined && !isValidLocale(node.locale)) {
    errors.push({ code: "invalid-locale", message: `Unknown locale "${node.locale}".`, placeholder });
  }

  if (errors.length === before) {
    try {
      // Offsets can be well-formed and still leave the range of Date.
      formatDatePlaceholder(node.kind, new Date(), node);
    } catch {
      errors.push({ code: "invalid-date-offset", message: "Date offset is out of range.", placeholder });
    }
  }
}

/** Validates parsed nodes. Exposed so that `render` does not have to parse twice. */
export function validateNodes(nodes: readonly TemplateNode[], options: ValidateOptions = {}): ValidationResult {
  const errors: TemplateIssue[] = [];
  const hints: TemplateIssue[] = [];
  const placeholders = placeholdersOf(nodes);

  if (!nodes.some(isInputPlaceholder)) {
    errors.push({
      code: "missing-input",
      message: "Add at least one input placeholder: {selection}, {clipboard}, or {browser-tab}.",
    });
  }

  for (const node of placeholders) {
    checkAttributes(node, errors);
    checkModifiers(node, errors);
    if (node.kind === "clipboard") checkClipboardOffset(node, errors);
    checkBrowserTab(node, errors);
    checkSnippet(node, options, errors);
    checkDate(node, errors);
  }

  for (const node of nodes) {
    if (node.type !== "unknown") continue;
    hints.push(
      UNSUPPORTED.has(node.name)
        ? {
            code: "unsupported-placeholder",
            message: `{${node.name}} is not supported and stays as plain text.`,
            placeholder: node.raw,
          }
        : {
            code: "unknown-placeholder",
            message: `Unknown placeholder {${node.name}} stays as plain text. Is it a typo?`,
            placeholder: node.raw,
          },
    );
  }

  const argumentNodes = placeholders.filter((node) => node.kind === "argument");
  const named = new Set(argumentNodes.flatMap((node) => (node.name ? [node.name] : [])));
  const distinct = named.size + argumentNodes.filter((node) => !node.name).length;
  if (distinct >= ARGUMENT_HINT_THRESHOLD) {
    hints.push({
      code: "too-many-arguments",
      message: `This prompt asks for ${distinct} arguments. Raycast allows at most 3, so it would not work there.`,
    });
  }

  return { ok: errors.length === 0, errors, hints };
}

export function validateTemplate(template: string, options: ValidateOptions = {}): ValidationResult {
  return validateNodes(parseTemplate(template), options);
}

function hasSelection(nodes: readonly TemplateNode[]): boolean {
  return placeholdersOf(nodes).some((node) => node.kind === "selection");
}

function usesSelection(template: string): boolean {
  return hasSelection(parseTemplate(template));
}

export interface TemplateInspection {
  outputModes: readonly OutputMode[];
  canHighlight: boolean;
  hints: TemplateIssue[];
}

/** What a form needs per keystroke, from a single parse. */
export function inspectTemplate(template: string, options: ValidateOptions = {}): TemplateInspection {
  const nodes = parseTemplate(template);
  const withSelection = hasSelection(nodes);
  return {
    outputModes: withSelection ? SELECTION_OUTPUTS : NO_SELECTION_OUTPUTS,
    canHighlight: withSelection,
    hints: validateNodes(nodes, options).hints,
  };
}

/** Writing back into the source app needs a selection to replace. */
export function allowedOutputModes(template: string): readonly OutputMode[] {
  return usesSelection(template) ? SELECTION_OUTPUTS : NO_SELECTION_OUTPUTS;
}

/** The diff always compares against `{selection}`. */
export function canHighlightChanges(template: string): boolean {
  return usesSelection(template);
}

/** Template checks plus the rules that tie the template to the output settings. */
export function validatePromptDraft(draft: PromptDraft, options: ValidateOptions = {}): ValidationResult {
  const result = validateTemplate(draft.template, options);
  const errors = [...result.errors];
  const selection = usesSelection(draft.template);

  if (!selection && !NO_SELECTION_OUTPUTS.includes(draft.output)) {
    errors.push({
      code: "output-requires-selection",
      message: "Replacing or inserting needs {selection} in the template.",
    });
  }
  if (!selection && draft.highlightChanges) {
    errors.push({ code: "highlight-requires-selection", message: "Highlight Changes needs {selection}." });
  }
  return { ok: errors.length === 0, errors, hints: result.hints };
}

/**
 * Snippets are inserted as raw text, see `render.ts`. Nesting is rejected like in Raycast. Other placeholders are
 * legal text but will not expand, which deserves a hint for anyone used to Raycast snippets.
 */
export function validateSnippetText(text: string): ValidationResult {
  const errors: TemplateIssue[] = [];
  const hints: TemplateIssue[] = [];
  for (const node of placeholdersOf(parseTemplate(text))) {
    if (node.kind === "snippet") {
      errors.push({
        code: "nested-snippet",
        message: "Snippets cannot contain other snippets.",
        placeholder: node.raw,
      });
    } else {
      hints.push({
        code: "snippet-placeholder-literal",
        message: `${node.raw} stays as plain text inside a snippet.`,
        placeholder: node.raw,
      });
    }
  }
  return { ok: errors.length === 0, errors, hints };
}
