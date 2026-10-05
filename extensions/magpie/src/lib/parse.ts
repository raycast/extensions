import { agentId } from "./agents";

export type AgentExtra = { label: string; value: string };

export type AgentRow = {
  id?: string;
  name: string;
  /** Configured model, including a trailing context marker such as `[1m]`. */
  model: string;
  /** Context window marker printed after the model id, without brackets. */
  context?: string;
  extras: AgentExtra[];
  path?: string;
  hidden: boolean;
};

export type ModelEntry = {
  id: string;
  name?: string;
  efforts?: string[];
  section: string;
};

export type ModelCatalog = {
  empty: boolean;
  sections: { title: string; models: ModelEntry[] }[];
};

export type ProfileRow = { name: string; summary: string };

export type UsageRow = {
  name: string;
  share: string;
  tokens: string;
  calls: string;
  price: string;
};

export type UsageReport =
  | { ok: false; raw: string }
  | { ok: true; empty: true; raw: string; path?: string }
  | {
      ok: true;
      empty: false;
      raw: string;
      tokens: string;
      period: string;
      calls: number;
      price: string;
      breakdown: string;
      agents: UsageRow[];
      models: UsageRow[];
      /** Sections added after agents/models, such as provider keys and accounts. */
      extras: { title: string; rows: UsageRow[] }[];
      sessions: UsageRow[];
      /** Text after `sessions ·`, for example `top 10 of 18`. */
      sessionNote?: string;
      path?: string;
    };

export type QuotaWindow = {
  name: string;
  used: number;
  remaining: number;
  resetsAt?: string;
  display?: string;
};

export type ResetInfo = { count: number; until?: string };

export type AccountRow = {
  agent: string;
  user: string;
  plan?: string;
  active: boolean;
  on: boolean;
  windows: QuotaWindow[];
  resets?: ResetInfo;
  error?: string;
};

export type QuotaRow = {
  provider: string;
  name: string;
  kind: string;
  user?: string;
  plan?: string;
  balance?: string;
  until?: string;
  windows: QuotaWindow[];
  resets?: ResetInfo;
};

export type SessionRow = {
  agent: string;
  id: string;
  cwd?: string;
  title?: string;
  start?: string;
  last?: string;
  models: string[];
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  cost: number;
  unpriced: boolean;
  resume?: string;
};

const EFFORT =
  /^(?:none|minimal|low|medium|high|xhigh|max|ultra)(?:\/(?:none|minimal|low|medium|high|xhigh|max|ultra))*$/;
const LABELED = /^([a-z][a-z0-9-]*)\s+(\S.*)$/;
const EMPTY = new Set(["—", "–", "-"]);
const CONTEXT = /\[([^\]]+)\]$/;

export function parseAgents(text: string): AgentRow[] {
  const rows: AgentRow[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    // The settings path is the last column. It can contain spaces
    // (`~/Library/Application Support/...`), so the gap before it is what marks it.
    const pathMatch = line.match(/^(.*\S) {2,}((?:~\/|\/).+)\s*$/);
    if (!pathMatch) continue;

    const left = pathMatch[1].trim();
    const gap = left.search(/\s{2,}/);
    const namePart = (gap === -1 ? left : left.slice(0, gap)).trim();
    const vals = gap === -1 ? "" : left.slice(gap).trim();
    const hidden = namePart.endsWith(" hidden");
    const name = hidden ? namePart.slice(0, -" hidden".length) : namePart;
    const fields = splitFields(vals);
    const context = fields.model.match(CONTEXT)?.[1];

    rows.push({
      id: agentId(name),
      name,
      model: fields.model,
      context,
      extras: fields.extras,
      path: pathMatch[2].trim(),
      hidden,
    });
  }
  return rows;
}

function splitFields(vals: string): { model: string; extras: AgentExtra[] } {
  const extras: AgentExtra[] = [];
  let model = "";
  if (!vals) return { model, extras };

  for (const part of vals.split("  ·  ")) {
    if (!part || EMPTY.has(part)) continue;
    const labeled = part.match(LABELED);
    // A real field is `effort medium` or `small deepseek/deepseek-flash`.
    // Placeholder text such as `magpie cindy add  to add magpie` also starts
    // with a lowercase word, but the wide gap keeps it a single model column.
    if (labeled && !labeled[2].includes("  ")) {
      if (!EMPTY.has(labeled[2])) {
        extras.push({ label: labeled[1], value: labeled[2] });
      }
    } else {
      model = part.trim();
    }
  }
  return { model, extras };
}

export function parseModels(text: string): ModelCatalog {
  if (text.includes("no models yet")) return { empty: true, sections: [] };

  const sections: { title: string; models: ModelEntry[] }[] = [];
  let current = "";

  const sectionFor = (title: string) => {
    let found = sections.find((section) => section.title === title);
    if (!found) {
      found = { title, models: [] };
      sections.push(found);
    }
    return found;
  };

  for (const line of text.split(/\r?\n/)) {
    const body = line.trimEnd().replace(/^ {2}/, "");
    if (!body.trim()) continue;
    if (/^https?:\/\//.test(body.trim())) continue;

    const trimmed = body.trim();
    if (!trimmed.includes("/")) {
      current = trimmed;
      continue;
    }

    const match = trimmed.match(/^(\S+)\s*(.*)$/);
    if (!match || !match[1].includes("/")) continue;

    const rest = match[2].trim();
    let name: string | undefined;
    let efforts: string[] | undefined;
    if (rest) {
      const pieces = rest.split(/\s{2,}/);
      if (pieces.length >= 2 && EFFORT.test(pieces[pieces.length - 1])) {
        efforts = pieces[pieces.length - 1].split("/");
        const label = pieces.slice(0, -1).join("  ").trim();
        if (label) name = label;
      } else if (EFFORT.test(rest)) {
        efforts = rest.split("/");
      } else {
        name = rest;
      }
    }

    sectionFor(current || "Models").models.push({
      id: match[1],
      name,
      efforts,
      section: current || "Models",
    });
  }

  return {
    empty: sections.every((section) => section.models.length === 0),
    sections,
  };
}

export function parseProfiles(text: string): {
  empty: boolean;
  profiles: ProfileRow[];
} {
  if (!text.trim() || text.includes("no profiles yet"))
    return { empty: true, profiles: [] };

  const profiles: ProfileRow[] = [];
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^ {2}(\S+)\s{2,}(.*)$/);
    if (!match) continue;
    profiles.push({ name: match[1], summary: match[2].trim() });
  }
  return { empty: profiles.length === 0, profiles };
}

export function parseUsage(text: string): UsageReport {
  const raw = text.replace(/\s+$/, "");
  const lines = text.split(/\r?\n/);
  if (lines.some((line) => line.startsWith("no calls"))) {
    return { ok: true, empty: true, raw, path: usagePath(lines) };
  }

  const head = lines.find((line) => line.includes(" tokens "));
  const headline = head?.match(/^(\S+) tokens (.+?) · (\d+) calls? · (.+)$/);
  if (!headline) return { ok: false, raw };

  const breakdown = lines.find((line) => /^\s+in /.test(line))?.trim() ?? "";
  const agents: UsageRow[] = [];
  const models: UsageRow[] = [];
  const extras: { title: string; rows: UsageRow[] }[] = [];
  const sessions: UsageRow[] = [];
  let sessionNote: string | undefined;
  let section: "agents" | "models" | "sessions" | "extra" | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "agents" || trimmed === "models") {
      section = trimmed;
      continue;
    }
    const sessionHeader = trimmed.match(/^sessions(?:\s+·\s+(\S.*))?$/);
    if (sessionHeader) {
      section = "sessions";
      sessionNote = sessionHeader[1]?.trim();
      continue;
    }
    if (!section || !line.startsWith("  ")) continue;
    if (
      trimmed.startsWith("/") ||
      trimmed.startsWith("~") ||
      trimmed.includes("usage.jsonl")
    )
      continue;

    const row = parseUsageRow(line);
    if (row) {
      const bucket =
        section === "agents"
          ? agents
          : section === "models"
            ? models
            : section === "sessions"
              ? sessions
              : extras[extras.length - 1]?.rows;
      if (!bucket) return { ok: false, raw };
      bucket.push(row);
      continue;
    }
    // Newer reports insert indented headers (provider keys, accounts) between
    // the known tables. A line with a percent sign is still a broken row.
    if (trimmed.includes("%")) return { ok: false, raw };
    section = "extra";
    extras.push({ title: trimmed, rows: [] });
  }

  return {
    ok: true,
    empty: false,
    raw,
    tokens: headline[1],
    period: headline[2],
    calls: Number(headline[3]),
    price: headline[4],
    breakdown,
    agents,
    models,
    extras: extras.filter((section) => section.rows.length > 0),
    sessions,
    sessionNote,
    path: usagePath(lines),
  };
}

function parseUsageRow(line: string): UsageRow | null {
  const match = line.match(
    /^ {2}(.+?)\s+(\d{1,3})%\s+(\S+)\s+(\d+)\s+calls?\s+(.+?)\s*$/,
  );
  if (!match) return null;
  return {
    name: match[1],
    share: `${match[2]}%`,
    tokens: match[3],
    calls: match[4],
    price: match[5],
  };
}

function usagePath(lines: string[]): string | undefined {
  return lines
    .map((line) => line.trim())
    .find((line) => line.startsWith("/") || line.startsWith("~"));
}

export function parseAccounts(text: string): AccountRow[] {
  const data: unknown = JSON.parse(text);
  if (!Array.isArray(data))
    throw new Error("magpie accounts --json did not return an array");

  return data.map((entry) => {
    const row = entry as Partial<AccountRow> & {
      windows?: Partial<QuotaWindow>[];
    };
    return {
      agent: String(row.agent ?? ""),
      user: String(row.user ?? ""),
      plan: row.plan ? String(row.plan) : undefined,
      active: Boolean(row.active),
      on: Boolean(row.on),
      error: row.error ? String(row.error) : undefined,
      resets: parseResets((entry as { resets?: unknown }).resets),
      windows: (row.windows ?? []).map(parseWindow),
    };
  });
}

export function parseQuotas(text: string): QuotaRow[] {
  const data: unknown = JSON.parse(text);
  if (!Array.isArray(data))
    throw new Error("magpie quota --json did not return an array");

  return data.map((entry) => {
    const row = entry as Partial<QuotaRow> & {
      windows?: Partial<QuotaWindow>[];
    };
    return {
      provider: String(row.provider ?? ""),
      name: String(row.name ?? row.provider ?? ""),
      kind: String(row.kind ?? ""),
      user: row.user ? String(row.user) : undefined,
      plan: row.plan ? String(row.plan) : undefined,
      balance: row.balance ? String(row.balance) : undefined,
      until: row.until ? String(row.until) : undefined,
      resets: parseResets(row.resets),
      windows: (row.windows ?? []).map(parseWindow),
    };
  });
}

export function parseSessions(text: string): SessionRow[] {
  const data: unknown = JSON.parse(text);
  if (!Array.isArray(data))
    throw new Error("magpie sessions --json did not return an array");

  return data.map((entry) => {
    const row = entry as Record<string, unknown>;
    const models = Array.isArray(row.models) ? row.models : [];
    return {
      agent: String(row.agent ?? ""),
      id: String(row.id ?? ""),
      cwd: row.cwd ? String(row.cwd) : undefined,
      title: row.title ? String(row.title) : undefined,
      start: row.start ? String(row.start) : undefined,
      last: row.last ? String(row.last) : undefined,
      models: models
        .map((model) => {
          if (model && typeof model === "object" && "model" in model) {
            return String((model as { model?: unknown }).model ?? "");
          }
          return String(model ?? "");
        })
        .filter(Boolean),
      input: num(row.input),
      output: num(row.output),
      cacheRead: num(row.cache_read),
      cacheWrite: num(row.cache_write),
      cost: num(row.cost),
      unpriced: Boolean(row.unpriced),
      resume: row.resume ? String(row.resume) : undefined,
    };
  });
}

function parseWindow(window: Partial<QuotaWindow>): QuotaWindow {
  return {
    name: String(window.name ?? ""),
    used: Number(window.used ?? 0),
    remaining: Number(window.remaining ?? 0),
    resetsAt: window.resetsAt ? String(window.resetsAt) : undefined,
    display: window.display ? String(window.display) : undefined,
  };
}

function parseResets(value: unknown): ResetInfo | undefined {
  if (!value || typeof value !== "object") return undefined;
  const row = value as { count?: unknown; until?: unknown };
  const count = Number(row.count);
  if (!Number.isFinite(count)) return undefined;
  return { count, until: row.until ? String(row.until) : undefined };
}

function num(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Model id as printed, without a trailing context marker such as `[1m]`. */
export function modelLabel(model: string): string {
  return model.replace(CONTEXT, "");
}

/**
 * Gateway-routed models are stored as `magpie/<catalog id>`.
 * Claude Code appends the context window, as in `provider/model[1m]`.
 */
export function sameModel(configured: string, catalogId: string): boolean {
  const left = modelLabel(configured).replace(/^magpie\//, "");
  const right = modelLabel(catalogId).replace(/^magpie\//, "");
  return left.length > 0 && left === right;
}

/**
 * Catalog id to mark as current. An exact id wins. A bare slug such as
 * `grok-4.7` matches `grok/grok-4.7` only when no other catalog id shares it.
 */
export function matchingModelId(
  configured: string,
  catalogIds: string[],
): string | undefined {
  const label = modelLabel(configured).replace(/^magpie\//, "");
  if (!label) return undefined;
  const exact = catalogIds.find((id) => sameModel(label, id));
  if (exact) return exact;
  if (label.includes("/")) return undefined;
  const tails = catalogIds.filter((id) => id.split("/").at(-1) === label);
  return tails.length === 1 ? tails[0] : undefined;
}

export function parseConfirmation(stdout: string): {
  summary: string;
  notice?: string;
} {
  const lines = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const summary = (lines[0] ?? "Updated").replace(/^✓\s*/, "");
  const noticeLine = lines.slice(1).find((line) => line.includes("↻"));
  return { summary, notice: noticeLine?.replace(/^↻\s*/, "").trim() };
}
