// Copied from raycast-window-switcher src/lib/protocol.ts on 2026-09-30, unchanged except this header
// Helper protocol v1 (SPEC.md §6.2). Pure: no Raycast imports, so it runs under `node --test`.

export const HELPER_SCHEMA = 1;

export interface HelperApp {
  pid: number;
  name: string;
  bundleId?: string;
  bundlePath?: string;
  isHidden: boolean;
}

export interface HelperWindow {
  pid: number;
  wid: number;
  title: string;
  titleSource: "ax" | "ax-empty" | "none";
  isMinimized: boolean;
  isFullscreen: boolean;
  spaceIds: number[];
  onScreen: boolean;
  zIndex?: number;
  resolved: boolean;
  subrole?: string;
  foundBy: string;
}

export interface HelperDisplay {
  uuid: string;
  name?: string;
  isMain: boolean;
  spaceIds: number[];
  spaceTypes: number[];
  currentSpaceId?: number;
}

export interface HelperWarning {
  pid: number;
  code: string;
  message: string;
}

export interface WindowList {
  generatedAt: string;
  elapsedMs: number;
  spaces: { available: boolean; visibleSpaceIds: number[]; displays: HelperDisplay[] };
  apps: HelperApp[];
  windows: HelperWindow[];
  excludedCount: number;
  warnings: HelperWarning[];
}

export type FailureKind =
  | "helper-missing"
  | "helper-not-executable"
  | "timeout"
  | "not-trusted"
  | "bad-output"
  | "version-mismatch"
  | "helper-error"
  | "unsupported-architecture";

export interface Failure {
  kind: FailureKind;
  detail: string;
}

export type Parsed<T> = { ok: true; value: T } | { ok: false; failure: Failure };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

function parseJson(text: string): Parsed<Record<string, unknown>> {
  let value: unknown;
  try {
    value = JSON.parse(text.trim());
  } catch {
    return { ok: false, failure: { kind: "bad-output", detail: "Helper output is not JSON" } };
  }
  if (!isObject(value)) return { ok: false, failure: { kind: "bad-output", detail: "Helper output is not an object" } };
  if (value.schema !== HELPER_SCHEMA) {
    return {
      ok: false,
      failure: { kind: "version-mismatch", detail: `Helper schema ${String(value.schema)}, expected ${HELPER_SCHEMA}` },
    };
  }
  return { ok: true, value };
}

function validWindow(w: unknown): w is HelperWindow {
  return (
    isObject(w) &&
    isNum(w.pid) &&
    isNum(w.wid) &&
    typeof w.title === "string" &&
    typeof w.isMinimized === "boolean" &&
    typeof w.isFullscreen === "boolean" &&
    Array.isArray(w.spaceIds) &&
    w.spaceIds.every(isNum) &&
    typeof w.onScreen === "boolean" &&
    typeof w.resolved === "boolean"
  );
}

function validApp(a: unknown): a is HelperApp {
  return isObject(a) && isNum(a.pid) && typeof a.name === "string" && typeof a.isHidden === "boolean";
}

export function parseList(text: string): Parsed<WindowList> {
  const parsed = parseJson(text);
  if (!parsed.ok) return parsed;
  const v = parsed.value;
  if (v.ok === false) {
    const kind: FailureKind = v.code === "not-trusted" ? "not-trusted" : "helper-error";
    return { ok: false, failure: { kind, detail: String(v.message ?? v.code ?? "Helper reported an error") } };
  }
  if (!Array.isArray(v.windows) || !Array.isArray(v.apps) || !v.windows.every(validWindow) || !v.apps.every(validApp)) {
    return { ok: false, failure: { kind: "bad-output", detail: "Helper list is missing or has malformed fields" } };
  }
  const spaces = isObject(v.spaces) ? v.spaces : {};
  return {
    ok: true,
    value: {
      generatedAt: String(v.generatedAt ?? ""),
      elapsedMs: isNum(v.elapsedMs) ? v.elapsedMs : 0,
      spaces: {
        available: spaces.available === true,
        visibleSpaceIds: Array.isArray(spaces.visibleSpaceIds) ? spaces.visibleSpaceIds.filter(isNum) : [],
        displays: Array.isArray(spaces.displays) ? (spaces.displays as HelperDisplay[]) : [],
      },
      apps: v.apps,
      windows: v.windows,
      excludedCount: Array.isArray(v.excluded) ? v.excluded.length : 0,
      warnings: Array.isArray(v.warnings) ? (v.warnings as HelperWarning[]) : [],
    },
  };
}

export interface FocusResult {
  ok: boolean;
  focused: boolean;
  code?: string;
  message?: string;
  tier?: string;
}

export function parseFocus(text: string): Parsed<FocusResult> {
  const parsed = parseJson(text);
  if (!parsed.ok) return parsed;
  const v = parsed.value;
  if (typeof v.ok !== "boolean" || typeof v.focused !== "boolean") {
    return { ok: false, failure: { kind: "bad-output", detail: "Helper focus response is malformed" } };
  }
  return {
    ok: true,
    value: {
      ok: v.ok,
      focused: v.focused,
      code: typeof v.code === "string" ? v.code : undefined,
      message: typeof v.message === "string" ? v.message : undefined,
      tier: typeof v.tier === "string" ? v.tier : undefined,
    },
  };
}

export interface QuitResult {
  ok: boolean;
  quit: boolean;
  code?: string;
  message?: string;
}

export function parseQuit(text: string): Parsed<QuitResult> {
  const parsed = parseJson(text);
  if (!parsed.ok) return parsed;
  const v = parsed.value;
  if (typeof v.ok !== "boolean" || typeof v.quit !== "boolean") {
    return { ok: false, failure: { kind: "bad-output", detail: "Helper quit response is malformed" } };
  }
  return {
    ok: true,
    value: {
      ok: v.ok,
      quit: v.quit,
      code: typeof v.code === "string" ? v.code : undefined,
      message: typeof v.message === "string" ? v.message : undefined,
    },
  };
}

export interface CloseResult {
  ok: boolean;
  closed: boolean;
  code?: string;
  message?: string;
}

export function parseClose(text: string): Parsed<CloseResult> {
  const parsed = parseJson(text);
  if (!parsed.ok) return parsed;
  const v = parsed.value;
  if (typeof v.ok !== "boolean" || typeof v.closed !== "boolean") {
    return { ok: false, failure: { kind: "bad-output", detail: "Helper close response is malformed" } };
  }
  return {
    ok: true,
    value: {
      ok: v.ok,
      closed: v.closed,
      code: typeof v.code === "string" ? v.code : undefined,
      message: typeof v.message === "string" ? v.message : undefined,
    },
  };
}
