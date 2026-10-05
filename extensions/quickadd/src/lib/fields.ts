import type { FormField, PromptSpec } from "./interactive";

interface FieldBase {
  id: string;
  label: string;
  optional: boolean;
  description?: string;
}

export interface Option {
  value: string;
  title: string;
}

export type FieldSpec =
  | (FieldBase & {
      kind: "text";
      multiline: boolean;
      placeholder?: string;
      defaultValue?: string;
    })
  | (FieldBase & {
      kind: "number";
      placeholder?: string;
      defaultValue?: string;
      min?: number;
      max?: number;
    })
  | (FieldBase & { kind: "date"; defaultValue?: string; withTime: boolean })
  | (FieldBase & {
      kind: "select";
      options: Option[];
      allowCustom: boolean;
      notePicker: boolean;
      defaultValue?: string;
    })
  | (FieldBase & {
      kind: "multi";
      options: Option[];
      allowCustom: boolean;
      preselected: string[];
    });

type InputPrompt = Extract<PromptSpec, { type: "input" }>;
type DatePrompt = Extract<PromptSpec, { type: "date" }>;
type MultiselectPrompt = Extract<PromptSpec, { type: "multiselect" }>;

const MOMENT_ESCAPED_LITERAL = /\[[^\]]*\]/g;
const MOMENT_TIME_TOKEN = /[HhkmsS]/;

function formatHasTime(dateFormat: string | undefined): boolean {
  return MOMENT_TIME_TOKEN.test(
    (dateFormat ?? "").replace(MOMENT_ESCAPED_LITERAL, ""),
  );
}

// QuickAdd's one-page form seeds a multi-select with a comma-separated default.
// Options are matched longest-first so an option containing ", " wins over a
// plain comma split, mirroring QuickAdd's splitMultiSelectLabels.
function multiDefault(
  defaultValue: string | undefined,
  options: Option[],
): string[] {
  const values = options
    .map((option) => option.value)
    .sort((a, b) => b.length - a.length);
  const picked: string[] = [];
  let rest = (defaultValue ?? "").trim();
  while (rest) {
    const value = values.find((v) => rest === v || rest.startsWith(`${v}, `));
    if (!value) break;
    picked.push(value);
    rest = rest.slice(value.length + 2);
  }
  for (const piece of rest.split(",")) {
    if (values.includes(piece.trim())) picked.push(piece.trim());
  }
  return picked;
}

export function fieldSpecFromForm(field: FormField): FieldSpec {
  const base: FieldBase = {
    id: field.id,
    label: field.label,
    optional: field.optional === true,
    description: field.description,
  };
  const options = (field.options ?? []).map((value, index) => ({
    value,
    title: field.displayOptions?.[index] ?? value,
  }));
  const allowCustom = field.suggesterConfig?.allowCustomInput === true;
  const multiSelect = field.suggesterConfig?.multiSelect === true;

  switch (field.type) {
    case "date":
      return {
        ...base,
        kind: "date",
        defaultValue: field.defaultValue,
        withTime: formatHasTime(field.dateFormat),
      };
    case "number":
    case "slider":
      return {
        ...base,
        kind: "number",
        placeholder: field.placeholder,
        defaultValue: field.defaultValue,
        min: field.numericConfig?.min,
        max: field.numericConfig?.max,
      };
    case "dropdown":
    case "suggester":
    case "field-suggest":
      if (options.length === 0) break;
      if (multiSelect) {
        return {
          ...base,
          kind: "multi",
          options,
          allowCustom,
          preselected: multiDefault(field.defaultValue, options),
        };
      }
      return {
        ...base,
        kind: "select",
        options,
        allowCustom,
        notePicker: field.picker === "file",
        defaultValue: field.defaultValue,
      };
  }
  return {
    ...base,
    kind: "text",
    multiline: field.type === "textarea",
    placeholder: field.placeholder,
    defaultValue: field.defaultValue,
  };
}

export function fieldSpecFromPrompt(
  prompt: InputPrompt | DatePrompt | MultiselectPrompt,
): FieldSpec {
  switch (prompt.type) {
    case "input":
      // QuickAdd's own input prompt accepts an empty answer.
      return {
        id: "value",
        label: prompt.header,
        optional: true,
        kind: "text",
        multiline: prompt.multiline,
        placeholder: prompt.placeholder,
        defaultValue: prompt.defaultValue,
      };
    case "date":
      return {
        id: "value",
        label: prompt.header,
        optional: false,
        kind: "date",
        defaultValue: prompt.defaultValue,
        withTime: prompt.withTime === true || formatHasTime(prompt.dateFormat),
      };
    case "multiselect":
      return {
        id: "value",
        label: prompt.placeholder ?? "Select values",
        optional: true,
        kind: "multi",
        options: prompt.items,
        allowCustom: prompt.allowCustomInput,
        preselected: prompt.preselected,
      };
  }
}

export type FieldRead =
  { ok: true; value: string | string[] } | { ok: false; error: string };

const REQUIRED: FieldRead = { ok: false, error: "Required" };

export function readField(
  spec: FieldSpec,
  raw: unknown,
  custom: unknown,
): FieldRead {
  const customText = typeof custom === "string" ? custom.trim() : "";
  switch (spec.kind) {
    case "text": {
      // QuickAdd's input prompts hand the answer over untrimmed, so indented
      // or newline-terminated text must reach the script as typed.
      const text = typeof raw === "string" ? raw : "";
      if (!text.trim() && !spec.optional) return REQUIRED;
      return { ok: true, value: text };
    }
    case "number": {
      const text = typeof raw === "string" ? raw.trim() : "";
      if (!text) return spec.optional ? { ok: true, value: "" } : REQUIRED;
      const n = Number(text);
      if (!Number.isFinite(n)) return { ok: false, error: "Enter a number" };
      const { min, max } = spec;
      if ((min !== undefined && n < min) || (max !== undefined && n > max)) {
        const error =
          min !== undefined && max !== undefined
            ? `Between ${min} and ${max}`
            : min !== undefined
              ? `At least ${min}`
              : `At most ${max}`;
        return { ok: false, error };
      }
      return { ok: true, value: text };
    }
    case "date":
      if (raw instanceof Date) return { ok: true, value: raw.toISOString() };
      return spec.optional ? { ok: true, value: "" } : REQUIRED;
    case "select": {
      if (customText) return { ok: true, value: customText };
      const picked = typeof raw === "string" ? raw : "";
      if (!picked && spec.notePicker && !spec.optional) return REQUIRED;
      return { ok: true, value: picked };
    }
    case "multi": {
      const picked = Array.isArray(raw) ? raw.map(String) : [];
      const typed = customText
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
      const values = [...new Set([...picked, ...typed])];
      if (values.length === 0 && !spec.optional) return REQUIRED;
      return { ok: true, value: values };
    }
  }
}
