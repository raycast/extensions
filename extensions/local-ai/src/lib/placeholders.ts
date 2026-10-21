export const MAX_ARGUMENTS = 3;
export const SELECTION_MARKER = "the provided text";
export const CLIPBOARD_MARKER = "the clipboard text provided after the main text";

export interface ArgumentSpec {
  name: string;
  defaultValue?: string;
  options?: string[];
}

export interface ParsedPrompt {
  arguments: ArgumentSpec[];
  usesSelection: boolean;
  usesClipboard: boolean;
  unsupported: string[];
  errors: string[];
}

export interface RenderContext {
  argumentValues: Record<string, string>;
  now: Date;
  locale?: string;
  selectionReplacement: string;
  clipboardReplacement: string;
}

const PLACEHOLDER = /\{([a-z][a-z-]*)(\s[^{}]*)?\}/g;
const ATTRIBUTE = /([a-z][a-z-]*)="([^"]*)"/g;
const DEFAULT_ARGUMENT_NAME = "argument";

export function parsePrompt(prompt: string): ParsedPrompt {
  const parsed: ParsedPrompt = {
    arguments: [],
    usesSelection: false,
    usesClipboard: false,
    unsupported: [],
    errors: [],
  };

  for (const match of prompt.matchAll(PLACEHOLDER)) {
    const [, identifier, rest = ""] = match;
    switch (identifier) {
      case "selection":
        parsed.usesSelection = true;
        break;
      case "clipboard":
        parsed.usesClipboard = true;
        break;
      case "date":
      case "time":
        break;
      case "argument": {
        const spec = toArgumentSpec(rest);
        if (!parsed.arguments.some((existing) => existing.name === spec.name)) parsed.arguments.push(spec);
        break;
      }
      default:
        if (!parsed.unsupported.includes(identifier)) parsed.unsupported.push(identifier);
    }
  }

  if (parsed.arguments.length > MAX_ARGUMENTS) parsed.errors.push(`Use at most ${MAX_ARGUMENTS} arguments`);
  return parsed;
}

export function renderInstructions(prompt: string, ctx: RenderContext): string {
  return prompt.replace(PLACEHOLDER, (whole, identifier: string, rest: string | undefined) => {
    switch (identifier) {
      case "selection":
        return ctx.selectionReplacement;
      case "clipboard":
        return ctx.clipboardReplacement;
      case "date":
        return new Intl.DateTimeFormat(ctx.locale, { dateStyle: "medium" }).format(ctx.now);
      case "time":
        return new Intl.DateTimeFormat(ctx.locale, { timeStyle: "short" }).format(ctx.now);
      case "argument": {
        const spec = toArgumentSpec(rest ?? "");
        const value = Object.hasOwn(ctx.argumentValues, spec.name) ? ctx.argumentValues[spec.name] : "";
        return value || spec.defaultValue || "";
      }
      default:
        return whole;
    }
  });
}

function toArgumentSpec(attributeText: string): ArgumentSpec {
  const attributes = new Map<string, string>();
  for (const [, key, value] of attributeText.matchAll(ATTRIBUTE)) {
    if (!attributes.has(key)) attributes.set(key, value);
  }

  const spec: ArgumentSpec = { name: attributes.get("name")?.trim() || DEFAULT_ARGUMENT_NAME };
  const defaultValue = attributes.get("default");
  if (defaultValue !== undefined) spec.defaultValue = defaultValue;
  const options = attributes
    .get("options")
    ?.split(",")
    .map((option) => option.trim())
    .filter(Boolean);
  if (options?.length) spec.options = options;
  return spec;
}
