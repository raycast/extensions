import type { ToolParameter, ToolParameterOption, WiroModel } from "./wiro";

// Reads a model's parameter schema (Tool/Detail) and turns it into form fields.
// Models in one category name their inputs differently (inputImage, firstFrame,
// inputAudio, text, prompt), so the file inputs and the prompt are found by
// their type, id and label rather than by a fixed name.

export const FILE_TYPES = new Set(["fileinput", "multifileinput", "combinefileinput"]);
const SELECT_TYPES = new Set(["select", "selectwithcover"]);
const NUMBER_TYPES = new Set(["number", "float", "range"]);
const TEXT_TYPES = new Set(["text", "textarea"]);

export type MediaKind = "image" | "video" | "audio" | "file";

// Models the extension never lists: sexual content has no place in the Store.
// Some uncensored chat models say so only in their description. A model that
// detects NSFW content is a moderation tool and stays in.
const UNCENSORED = /uncensored|decensored|abliterated|obliterated|heretic|refusal[- ]reduced/i;
const NSFW = /nsfw/i;
const MODERATION = /detect|classif|moderat|filter|checker/i;

export function isListedModel(slug: string, title = "", description = ""): boolean {
  if (UNCENSORED.test(`${slug} ${title} ${description}`)) return false;
  const name = `${slug} ${title}`;
  return !(NSFW.test(name) && !MODERATION.test(name));
}

/** Live (realtime) models need a streaming session, which a one-shot run cannot give them. */
export function isLiveModel(model: Pick<WiroModel, "categories" | "dynamicprice">): boolean {
  const categories = model.categories ?? [];
  if (categories.some((category) => /realtime/i.test(category))) return true;
  const prices = typeof model.dynamicprice === "string" ? model.dynamicprice : JSON.stringify(model.dynamicprice ?? []);
  return prices.includes("per-realtime-turn");
}

export function allParameters(model: Pick<WiroModel, "parameters">): ToolParameter[] {
  return (model.parameters ?? []).flatMap((group) => group?.items ?? []).filter((item) => Boolean(item?.id));
}

export function isFileParameter(item: ToolParameter): boolean {
  return FILE_TYPES.has(String(item.type).toLowerCase());
}

/** The kind of file a file parameter takes, from its id, label and placeholder. */
export function fileKind(item: ToolParameter): MediaKind {
  const text = `${item.id} ${item.label ?? ""} ${item.placeholder ?? ""}`.toLowerCase();
  if (/video|clip|mp4|footage/.test(text)) return "video";
  if (/audio|voice|speech|song|music|sound|mp3|wav|vocal/.test(text)) return "audio";
  if (
    /image|photo|picture|face|portrait|frame|logo|mask|garment|cloth|human|person|product|reference|selfie|avatar|style/.test(
      text,
    )
  ) {
    return "image";
  }
  return "file";
}

export interface FileSlot {
  param: ToolParameter;
  kind: MediaKind;
  /** combinefileinput and multifileinput take several files. */
  multiple: boolean;
}

/** The model's file inputs, in schema order. */
export function fileSlots(model: Pick<WiroModel, "parameters">): FileSlot[] {
  return allParameters(model)
    .filter(isFileParameter)
    .map((param) => ({
      param,
      kind: fileKind(param),
      multiple: String(param.type).toLowerCase() !== "fileinput",
    }));
}

/** Text fields that only repeat a file field as a URL (inputImageUrl, inputDocumentUrlMultiple). */
function urlTwinIds(model: Pick<WiroModel, "parameters">): Set<string> {
  const ids = new Set<string>();
  const items = allParameters(model);
  for (const slot of fileSlots(model)) {
    const id = slot.param.id;
    const twins = [`${id}url`, id.endsWith("Multiple") ? id.replace(/Multiple$/, "UrlMultiple") : `${id}UrlMultiple`];
    for (const item of items) {
      if (twins.some((twin) => twin.toLowerCase() === item.id.toLowerCase())) ids.add(item.id);
    }
  }
  return ids;
}

const PROMPT_ID =
  /^(prompt|text|script|lyrics|caption|captions|instruction|instructions|query|question|message|userprompt|user_prompt|inputtext|input_text)$/i;
const NEGATIVE = /negative/i;

/** The text parameter the prompt goes to. */
export function promptParameter(model: Pick<WiroModel, "parameters">): ToolParameter | undefined {
  const items = allParameters(model).filter((item) => !isFileParameter(item));
  const positive = (item: ToolParameter) => !NEGATIVE.test(item.id) && !NEGATIVE.test(item.label ?? "");
  return (
    items.find((item) => item.id === "prompt") ??
    items.find((item) => PROMPT_ID.test(item.id) && positive(item)) ??
    items.find((item) => item.type === "textarea" && /prompt/i.test(item.id) && positive(item)) ??
    items.find((item) => item.type === "textarea" && item.required && positive(item)) ??
    items.find((item) => item.type === "textarea" && !item.advanced && positive(item))
  );
}

/** The file input a file of this kind goes to: the first slot of that kind, else a slot of no clear kind. */
export function primarySlot(model: Pick<WiroModel, "parameters">, kind: MediaKind): FileSlot | undefined {
  const slots = fileSlots(model);
  const usable = (slot: FileSlot) => !/last|end|mask/i.test(slot.param.id);
  return (
    slots.find((slot) => slot.kind === kind && usable(slot) && !slot.param.advanced) ??
    slots.find((slot) => slot.kind === kind && usable(slot)) ??
    slots.find((slot) => slot.kind === "file" && usable(slot))
  );
}

export type InputFit = "full" | "partial" | "none";

/**
 * How well a model fits the input a command has: `full` when that input is all it needs,
 * `partial` when it also requires another file, `none` when it cannot take it.
 */
export function inputFit(model: Pick<WiroModel, "parameters">, input: MediaKind | "text"): InputFit {
  if (input === "text") return promptParameter(model) ? "full" : "none";
  const primary = primarySlot(model, input);
  if (!primary) return "none";
  const needsMore = fileSlots(model).some((slot) => slot.param.required && slot.param.id !== primary.param.id);
  return needsMore ? "partial" : "full";
}

export interface FieldOption {
  value: string;
  title: string;
}

export type FieldKind = "dropdown" | "checkbox" | "number" | "text";

/** One model setting shown in a form. */
export interface ModelField {
  id: string;
  kind: FieldKind;
  title: string;
  info?: string;
  placeholder?: string;
  required: boolean;
  /** Shown only when the user asks for advanced settings. */
  advanced: boolean;
  defaultValue: string | boolean;
  options: FieldOption[];
  min?: number;
  max?: number;
  integer: boolean;
  /** Long text, such as lyrics, shown as a text area. */
  multiline?: boolean;
}

function optionValue(option: ToolParameterOption): string | undefined {
  const value = option.value ?? option.id;
  return value === undefined || value === null ? undefined : String(value);
}

function optionTitle(option: ToolParameterOption, value: string): string {
  return String(option.text ?? option.label ?? option.name ?? value);
}

export function titleCase(text: string): string {
  return text
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim()
    .replace(/\b([a-z])/g, (letter) => letter.toUpperCase());
}

function numberOrUndefined(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function toField(item: ToolParameter, advanced: boolean): ModelField | undefined {
  const title = titleCase(item.label?.trim() || item.id);
  const info = [item.description, item.note].map((text) => text?.trim()).find(Boolean);
  const required = Boolean(item.required);
  const type = String(item.type).toLowerCase();

  if (SELECT_TYPES.has(type)) {
    const options: FieldOption[] = [];
    for (const option of item.options ?? []) {
      const value = optionValue(option);
      if (value === undefined || options.some((existing) => existing.value === value)) continue;
      options.push({ value, title: optionTitle(option, value) });
    }
    if (options.length === 0) return undefined;
    const fallback = String(item.defaultvalue ?? "");
    const defaultValue = options.some((option) => option.value === fallback) ? fallback : options[0].value;
    return { id: item.id, kind: "dropdown", title, info, required, advanced, defaultValue, options, integer: false };
  }

  if (type === "checkbox") {
    const value = String(item.defaultvalue ?? item.value ?? "").toLowerCase();
    return {
      id: item.id,
      kind: "checkbox",
      title,
      info,
      required: false,
      advanced,
      defaultValue: value === "true" || value === "1",
      options: [],
      integer: false,
    };
  }

  if (NUMBER_TYPES.has(type)) {
    const min = numberOrUndefined(item.minvalue);
    const max = numberOrUndefined(item.maxvalue);
    const fallback = numberOrUndefined(item.defaultvalue);
    const range = min !== undefined && max !== undefined ? `${min} to ${max}` : undefined;
    return {
      id: item.id,
      kind: "number",
      title,
      info: [info, range ? `Allowed values: ${range}.` : undefined].filter(Boolean).join(" ") || undefined,
      placeholder: range ?? (item.placeholder?.trim() || title),
      required,
      advanced,
      defaultValue: fallback === undefined ? "" : String(fallback),
      options: [],
      min,
      max,
      integer: type !== "float",
    };
  }

  if (TEXT_TYPES.has(type)) {
    return {
      id: item.id,
      kind: "text",
      title,
      info,
      placeholder: item.placeholder?.trim() || title,
      required,
      advanced,
      defaultValue: "",
      options: [],
      integer: false,
      multiline: type === "textarea",
    };
  }

  return undefined;
}

/** Settings that change the price, which the form shows even when the catalog marks them advanced. */
export function priceInputs(model: Pick<WiroModel, "dynamicprice">): Set<string> {
  const ids = new Set<string>();
  const value = model.dynamicprice;
  let rows: unknown = value;
  if (typeof value === "string") {
    try {
      rows = JSON.parse(value);
    } catch {
      rows = [];
    }
  }
  for (const row of Array.isArray(rows) ? rows : []) {
    const inputs = row && typeof row === "object" ? (row as { inputs?: Record<string, unknown> }).inputs : undefined;
    for (const key of Object.keys(inputs ?? {})) ids.add(key);
  }
  return ids;
}

// Settings people expect to see first, whatever the catalog marks as advanced.
const KEY_SETTING =
  /^(voice|voiceid|voice_id|speaker|language|languagecode|duration|resolution|ratio|aspectratio|aspect_ratio)$/i;

/**
 * The settings a form shows for a model, prompt and file inputs left out (they have their
 * own fields). Settings the catalog shows by default, the ones that change the price and key
 * settings such as voice come first; the rest are marked advanced.
 */
export function modelFields(model: Pick<WiroModel, "parameters" | "dynamicprice">): ModelField[] {
  const prompt = promptParameter(model)?.id;
  const twins = urlTwinIds(model);
  const pricing = priceInputs(model);
  const fields: ModelField[] = [];
  for (const item of allParameters(model)) {
    if (item.id === prompt || isFileParameter(item) || twins.has(item.id)) continue;
    const advanced = Boolean(item.advanced) && !pricing.has(item.id) && !KEY_SETTING.test(item.id) && !item.required;
    const field = toField(item, advanced);
    if (field && !fields.some((existing) => existing.id === field.id)) fields.push(field);
  }
  return fields;
}

/**
 * Defaults for required settings the form does not send, so the run validates. Only selects,
 * numbers and checkboxes are filled: text and file defaults in the catalog are samples.
 */
export function hiddenDefaults(
  model: Pick<WiroModel, "parameters">,
  sentIds: Iterable<string>,
): Record<string, string | number> {
  const sent = new Set(sentIds);
  const values: Record<string, string | number> = {};
  for (const item of allParameters(model)) {
    if (sent.has(item.id) || !item.required) continue;
    const fallback = item.defaultvalue;
    if (fallback === undefined || fallback === null || fallback === "") continue;
    const type = String(item.type).toLowerCase();
    if (NUMBER_TYPES.has(type)) {
      const number = numberOrUndefined(fallback);
      if (number !== undefined) values[item.id] = type === "float" ? number : Math.round(number);
    } else if (SELECT_TYPES.has(type) || type === "checkbox") {
      values[item.id] = String(fallback);
    }
  }
  return values;
}

/** Checks one form value; returns an error message or undefined. */
export function validateField(field: ModelField, value: unknown): string | undefined {
  if (field.kind === "number") {
    const text = String(value ?? "").trim();
    if (!text) return field.required ? "Required" : undefined;
    const number = Number(text);
    if (!Number.isFinite(number)) return "Enter a number";
    if (field.integer && !Number.isInteger(number)) return "Enter a whole number";
    if (field.min !== undefined && number < field.min) return `Minimum is ${field.min}`;
    if (field.max !== undefined && number > field.max) return `Maximum is ${field.max}`;
    return undefined;
  }
  if (field.kind === "text" && field.required && !String(value ?? "").trim()) return "Required";
  return undefined;
}

/** Turns form values into Run parameters. Empty optional fields are left out. */
export function fieldParams(fields: ModelField[], values: Record<string, unknown>): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  for (const field of fields) {
    const value = values[field.id];
    if (field.kind === "checkbox") {
      params[field.id] = value === true ? "true" : "false";
    } else if (field.kind === "number") {
      const text = String(value ?? "").trim();
      if (text) params[field.id] = Number(text);
    } else {
      const text = String(value ?? "").trim();
      if (text) params[field.id] = text;
    }
  }
  return params;
}

const MEDIA_EXTENSIONS: Record<Exclude<MediaKind, "file">, RegExp> = {
  image: /\.(png|jpe?g|webp|gif|bmp|tiff?|heic|heif|avif)$/i,
  video: /\.(mp4|mov|m4v|webm|mkv|avi)$/i,
  audio: /\.(mp3|wav|m4a|aac|flac|ogg|opus|aiff?|caf|webm)$/i,
};

/** Whether a local file looks like the given kind, by its extension. */
export function fileMatchesKind(path: string, kind: MediaKind): boolean {
  if (kind === "file") return true;
  return MEDIA_EXTENSIONS[kind].test(path);
}
