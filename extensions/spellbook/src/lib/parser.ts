export interface ParamDef {
  name: string;
  defaultValue?: string;
  options?: string[];
}

export interface SubstituteResult {
  command: string;
  missing: string[];
}

const ESCAPE_SENTINEL = " SPELLBOOK_LITERAL_BRACES ";
const PLACEHOLDER_RE =
  /\{\{([A-Za-z_][A-Za-z0-9_-]*)(?:=((?:\\[|}]|[^}])*))?\}\}/g;
const SAFE_VALUE_RE = /^[A-Za-z0-9_@%+=:,./~^-]+$/;
const MALFORMED_RE = /\{\{[A-Za-z_][A-Za-z0-9_-]*(=|$)/m;

function protectEscapes(template: string): string {
  return template.replaceAll("\\{{", ESCAPE_SENTINEL);
}

function restoreEscapes(text: string): string {
  return text.replaceAll(ESCAPE_SENTINEL, "{{");
}

function splitOptions(raw: string): string[] | undefined {
  const parts: string[] = [];
  let current = "";
  for (let i = 0; i < raw.length; i += 1) {
    const char = raw[i];
    const next = raw[i + 1];
    if (char === "\\" && (next === "|" || next === "}")) {
      current += next;
      i += 1;
    } else if (char === "|") {
      parts.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts.length > 1 ? parts : undefined;
}

function applyDefault(param: ParamDef, rawDefault: string): void {
  const restored = restoreEscapes(rawDefault);
  const options = splitOptions(restored);
  if (options) {
    param.options = options;
    param.defaultValue = options[0];
  } else {
    param.defaultValue = restored.replaceAll("\\|", "|").replaceAll("\\}", "}");
  }
}

export function parseTemplate(template: string): ParamDef[] {
  const seen = new Map<string, ParamDef>();
  for (const match of protectEscapes(template).matchAll(PLACEHOLDER_RE)) {
    const [, name, rawDefault] = match;
    const existing = seen.get(name);
    if (existing) {
      if (existing.defaultValue === undefined && rawDefault !== undefined) {
        applyDefault(existing, rawDefault);
      }
      continue;
    }
    const param: ParamDef = { name };
    if (rawDefault !== undefined) {
      applyDefault(param, rawDefault);
    }
    seen.set(name, param);
  }
  return [...seen.values()];
}

export function hasMalformedPlaceholder(template: string): boolean {
  const residue = protectEscapes(template).replace(PLACEHOLDER_RE, "");
  return MALFORMED_RE.test(residue);
}

export function shellQuote(value: string): string {
  if (value === "") {
    return "''";
  }
  // zsh expands bare words starting with "=" (=cmd lookup) and "~user"; "~" and "~/…" stay bare so paths still expand
  if (
    SAFE_VALUE_RE.test(value) &&
    !value.startsWith("=") &&
    !/^~[^/]/.test(value)
  ) {
    return value;
  }
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

export function defaultValues(params: ParamDef[]): Record<string, string> {
  const values: Record<string, string> = {};
  for (const param of params) {
    if (param.defaultValue !== undefined) {
      values[param.name] = param.defaultValue;
    }
  }
  return values;
}

export function effectiveValues(
  params: ParamDef[],
  lastValues?: Record<string, string>,
): Record<string, string> {
  const values = defaultValues(params);
  if (!lastValues) {
    return values;
  }
  for (const param of params) {
    const last = lastValues[param.name];
    if (last === undefined || last === "") {
      continue;
    }
    // a stale choice (template edited since last run) falls back to the default
    if (param.options && !param.options.includes(last)) {
      continue;
    }
    values[param.name] = last;
  }
  return values;
}

export function substitute(
  template: string,
  values: Record<string, string>,
): SubstituteResult {
  const missing: string[] = [];
  const defaults = new Map(
    parseTemplate(template).map((param) => [param.name, param.defaultValue]),
  );
  const substituted = protectEscapes(template).replace(
    PLACEHOLDER_RE,
    (whole, name: string) => {
      const provided = values[name];
      const fallback = defaults.get(name);
      const value =
        provided !== undefined && provided !== "" ? provided : fallback;
      if (value === undefined) {
        if (!missing.includes(name)) {
          missing.push(name);
        }
        return whole;
      }
      return shellQuote(value);
    },
  );
  return { command: restoreEscapes(substituted), missing };
}
