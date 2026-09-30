/** Shapes of QuickAdd's interactive prompts (QuickAdd 2.27 `quickadd:interactive`). */
export interface QaItem {
  title: string;
  value: string;
  checked?: boolean;
}

export interface QaField {
  id: string;
  label?: string;
  type?: string;
  placeholder?: string;
  defaultValue?: string;
  description?: string;
  options?: string[];
  displayOptions?: string[];
  dateFormat?: string;
  numericConfig?: { min?: number; max?: number; step?: number };
  optional?: boolean;
  suggesterConfig?: { allowCustomInput?: boolean; multiSelect?: boolean };
}

export interface QaPrompt {
  type: string;
  header?: string;
  placeholder?: string;
  defaultValue?: string;
  multiline?: boolean;
  withTime?: boolean;
  dateFormat?: string;
  text?: string | string[];
  items?: QaItem[];
  preselected?: string[];
  allowCustomInput?: boolean;
  fields?: QaField[];
}

export type FieldKind = "text" | "textarea" | "dropdown" | "tags" | "date" | "number" | "checkbox";

export interface FieldOption {
  value: string;
  title: string;
}

export interface FieldSpec {
  id: string;
  label: string;
  kind: FieldKind;
  placeholder?: string;
  info?: string;
  defaultValue?: string | string[] | boolean;
  options?: FieldOption[];
  allowCustom?: boolean;
  optional: boolean;
  withTime?: boolean;
  min?: number;
  max?: number;
}

/** Raycast form values, keyed `f<index>` and `f<index>-custom`. */
export type FormValues = Record<string, unknown>;

/** Moment formats with hours, minutes or seconds need a date-time picker. */
const hasTime = (dateFormat: string | undefined) => /[Hhkms]/.test((dateFormat ?? "").replace(/\[[^\]]*\]/g, ""));

function fieldSpec(field: QaField): FieldSpec {
  const options = (field.options ?? []).map((value, index) => ({
    value,
    title: field.displayOptions?.[index] ?? value,
  }));
  const allowCustom = field.suggesterConfig?.allowCustomInput === true;
  const base = {
    id: field.id,
    label: field.label ?? field.id,
    placeholder: field.placeholder,
    info: field.description,
    defaultValue: field.defaultValue,
    optional: field.optional === true,
  };
  switch (field.type) {
    case "textarea":
      return { ...base, kind: "textarea" };
    case "dropdown":
    case "suggester":
    case "field-suggest":
    case "file-picker":
      if (options.length === 0) return { ...base, kind: "text" };
      if (field.suggesterConfig?.multiSelect) {
        const defaults = field.defaultValue ? field.defaultValue.split(",").map((part) => part.trim()) : [];
        return { ...base, kind: "tags", options, allowCustom, defaultValue: defaults.filter(Boolean) };
      }
      return { ...base, kind: "dropdown", options, allowCustom };
    case "date":
      return { ...base, kind: "date", withTime: hasTime(field.dateFormat) };
    case "number":
    case "slider":
      return { ...base, kind: "number", min: field.numericConfig?.min, max: field.numericConfig?.max };
    case "checkbox":
      return { ...base, kind: "checkbox", defaultValue: field.defaultValue === "true", optional: true };
    default:
      return { ...base, kind: "text" };
  }
}

export function specsFromQuickAddFields(fields: QaField[]): FieldSpec[] {
  return fields.map(fieldSpec);
}

/** Form specs for prompts rendered as a Raycast form; undefined for suggester/confirm/info/unknown. */
export function specsForPrompt(prompt: QaPrompt): FieldSpec[] | undefined {
  switch (prompt.type) {
    case "form":
      return specsFromQuickAddFields(prompt.fields ?? []);
    case "input":
      return [
        {
          id: "value",
          label: prompt.header ?? "Value",
          kind: prompt.multiline ? "textarea" : "text",
          placeholder: prompt.placeholder,
          defaultValue: prompt.defaultValue,
          optional: true,
        },
      ];
    case "date":
      return [
        {
          id: "value",
          label: prompt.header ?? "Date",
          kind: "date",
          placeholder: prompt.placeholder,
          defaultValue: prompt.defaultValue,
          withTime: prompt.withTime === true || hasTime(prompt.dateFormat),
          optional: true,
        },
      ];
    case "checkbox":
      return (prompt.items ?? []).map((item) => ({
        id: item.value,
        label: item.title,
        kind: "checkbox" as const,
        defaultValue: item.checked === true,
        optional: true,
      }));
    case "multiselect":
      return [
        {
          id: "value",
          label: prompt.placeholder ?? "Select",
          kind: "tags",
          options: (prompt.items ?? []).map((item) => ({ value: item.value, title: item.title })),
          defaultValue: prompt.preselected ?? [],
          allowCustom: prompt.allowCustomInput === true,
          optional: true,
        },
      ];
    default:
      return undefined;
  }
}

export function dateReply(date: Date, withTime: boolean): string {
  const pad = (n: number) => String(Math.abs(n)).padStart(2, "0");
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  if (!withTime) return `@date:${day}`;
  // Readable local wall-clock time with its UTC offset (the same instant QuickAdd would get from a UTC string).
  const offset = -date.getTimezoneOffset();
  const zone = `${offset >= 0 ? "+" : "-"}${pad(Math.trunc(offset / 60))}:${pad(offset % 60)}`;
  return `@date:${day}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${zone}`;
}

export function fieldValue(spec: FieldSpec, values: FormValues, index: number): string | string[] {
  const raw = values[`f${index}`];
  const custom = values[`f${index}-custom`];
  const customText = typeof custom === "string" ? custom.trim() : "";
  switch (spec.kind) {
    case "date":
      return raw instanceof Date ? dateReply(raw, spec.withTime === true) : "";
    case "checkbox":
      return raw === true ? "true" : "false";
    case "tags": {
      const picked = Array.isArray(raw) ? raw.map(String) : [];
      const extra = customText
        ? customText
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean)
        : [];
      return [...picked, ...extra];
    }
    default:
      return customText || (typeof raw === "string" ? raw : "");
  }
}

export function validateForm(specs: FieldSpec[], values: FormValues): Record<number, string> {
  const errors: Record<number, string> = {};
  specs.forEach((spec, index) => {
    const value = fieldValue(spec, values, index);
    const empty = Array.isArray(value) ? value.length === 0 : value.trim() === "";
    if (spec.kind === "number" && !empty) {
      const range = rangeError(Number(value), spec.min, spec.max);
      if (range) errors[index] = range;
    } else if (empty && !spec.optional && spec.kind !== "checkbox") errors[index] = "Required";
  });
  return errors;
}

function rangeError(value: number, min: number | undefined, max: number | undefined): string | undefined {
  if (Number.isNaN(value)) return "Must be a number";
  const below = min !== undefined && value < min;
  const above = max !== undefined && value > max;
  if (!below && !above) return undefined;
  if (min !== undefined && max !== undefined) return `Must be between ${min} and ${max}`;
  return min !== undefined ? `Must be at least ${min}` : `Must be at most ${max}`;
}

export function replyForForm(prompt: QaPrompt, specs: FieldSpec[], values: FormValues): unknown {
  switch (prompt.type) {
    case "form":
      return Object.fromEntries(specs.map((spec, index) => [spec.id, fieldValue(spec, values, index)]));
    case "checkbox":
      return specs.filter((_, index) => values[`f${index}`] === true).map((spec) => spec.id);
    default:
      return fieldValue(specs[0], values, 0);
  }
}

/** Optional dropdowns start on "no value" ("") unless QuickAdd gave a default. */
export function dropdownDefault(spec: FieldSpec): string | undefined {
  const wanted = typeof spec.defaultValue === "string" ? spec.defaultValue : undefined;
  if (spec.options?.some((option) => option.value === wanted)) return wanted;
  return spec.optional ? "" : spec.options?.[0]?.value;
}

export function dateDefault(value: unknown): Date | undefined {
  if (typeof value !== "string" || value === "") return undefined;
  const text = value.replace(/^@date:/, "");
  // A date-only value is a local calendar day; Date.parse would read it as UTC midnight.
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (day) return new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3]));
  const time = Date.parse(text);
  return Number.isNaN(time) ? undefined : new Date(time);
}

export function promptTitle(prompt: QaPrompt, fallback: string): string {
  return prompt.header?.trim() || prompt.placeholder?.trim() || fallback;
}

export function messageMarkdown(prompt: QaPrompt): string {
  const text = Array.isArray(prompt.text) ? prompt.text.join("\n\n") : (prompt.text ?? "");
  return prompt.header ? `## ${prompt.header}\n\n${text}`.trim() : text;
}

export function unsupportedMarkdown(type: string): string {
  return `# Unsupported prompt\n\nQuickAdd asked for a \`${type}\` prompt, which this extension doesn't support yet. Cancel the run and run the choice from Obsidian.`;
}
