import { agentId } from "./agents";

export type AgentExtra = { label: string; value: string };

export type AgentRow = {
  id?: string;
  name: string;
  model: string;
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
      path?: string;
    };

export type QuotaWindow = {
  name: string;
  used: number;
  remaining: number;
  resetsAt?: string;
  display?: string;
};

export type AccountRow = {
  agent: string;
  user: string;
  plan?: string;
  active: boolean;
  on: boolean;
  windows: QuotaWindow[];
  error?: string;
};

const EFFORT =
  /^(?:none|minimal|low|medium|high|xhigh|max|ultra)(?:\/(?:none|minimal|low|medium|high|xhigh|max|ultra))*$/;
const LABELED = /^([a-z][a-z0-9-]*)\s+(\S.*)$/;

export function parseAgents(text: string): AgentRow[] {
  const rows: AgentRow[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const pathMatch = line.match(/ {2}(~\/\S+|\/\S+)\s*$/);
    if (!pathMatch || pathMatch.index === undefined) continue;

    const left = line.slice(0, pathMatch.index).trimEnd().replace(/^ {2}/, "");
    const gap = left.search(/\s{2,}/);
    const namePart = (gap === -1 ? left : left.slice(0, gap)).trim();
    const vals = gap === -1 ? "" : left.slice(gap).trim();
    const hidden = namePart.endsWith(" hidden");
    const name = hidden ? namePart.slice(0, -" hidden".length) : namePart;
    const fields = splitFields(vals);

    rows.push({
      id: agentId(name),
      name,
      model: fields.model,
      extras: fields.extras,
      path: pathMatch[1],
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
    if (!part || part === "—") continue;
    const labeled = part.match(LABELED);
    if (labeled) {
      extras.push({ label: labeled[1], value: labeled[2] });
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
  let section: "agents" | "models" | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "agents" || trimmed === "models") {
      section = trimmed;
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
    if (!row) return { ok: false, raw };
    (section === "agents" ? agents : models).push(row);
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
      windows: (row.windows ?? []).map((window) => ({
        name: String(window.name ?? ""),
        used: Number(window.used ?? 0),
        remaining: Number(window.remaining ?? 0),
        resetsAt: window.resetsAt ? String(window.resetsAt) : undefined,
        display: window.display ? String(window.display) : undefined,
      })),
    };
  });
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
