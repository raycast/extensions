import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface DejaSessionHit {
  harness: string;
  id: string;
  project: string;
  title?: string;
  started?: string;
  updated?: string;
  snippet?: string;
  strict?: boolean;
}

export interface SearchResultEnvelope {
  tier: string;
  strictHits: DejaSessionHit[];
  nearestHits: DejaSessionHit[];
}

export interface ShowSessionMessage {
  role: string;
  text: string;
  time?: string;
}

export interface ShowSessionEnvelope {
  harness: string;
  id: string;
  project: string;
  started?: string;
  updated?: string;
  messages: ShowSessionMessage[];
}

function normalizeHit(raw: unknown): DejaSessionHit {
  const item = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const session =
    item.session && typeof item.session === "object" && !Array.isArray(item.session)
      ? (item.session as Record<string, unknown>)
      : item;
  const snippets = Array.isArray(item.snippets) ? item.snippets : undefined;
  const firstSnippet = snippets?.find((s): s is string => typeof s === "string" && s.length > 0);
  const fallbackSnippet =
    typeof item.snippet === "string" ? item.snippet : typeof session.snippet === "string" ? session.snippet : undefined;
  return {
    harness: String(session.harness || ""),
    id: String(session.id || ""),
    project: String(session.project || ""),
    title: typeof session.title === "string" && session.title ? session.title : undefined,
    started: typeof session.started === "string" && session.started ? session.started : undefined,
    updated: typeof session.updated === "string" && session.updated ? session.updated : undefined,
    snippet: firstSnippet ?? fallbackSnippet,
    strict: Boolean(item.strict ?? session.strict),
  };
}

export function parseSearchJSON(raw: string): SearchResultEnvelope {
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) {
    return {
      tier: "exact",
      strictHits: parsed.map(normalizeHit).filter((h) => h.id.length > 0),
      nearestHits: [],
    };
  }
  const tier = typeof parsed?.tier === "string" ? parsed.tier : "exact";
  const rawHits: unknown[] = Array.isArray(parsed?.hits) ? parsed.hits : [];
  const hits = rawHits.map(normalizeHit).filter((h) => h.id.length > 0);
  if (tier === "relevance") {
    const strictHits = hits.filter((h) => Boolean(h.strict));
    const nearestHits = hits.filter((h) => !h.strict);
    return { tier, strictHits, nearestHits };
  }
  return { tier, strictHits: hits, nearestHits: [] };
}

export function parseLastJSON(raw: string): DejaSessionHit[] {
  const parsed = JSON.parse(raw);
  const arr: unknown[] = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.sessions)
      ? parsed.sessions
      : Array.isArray(parsed?.hits)
        ? parsed.hits
        : [];
  return arr.map(normalizeHit).filter((h) => h.id.length > 0);
}

export function parseShowJSON(raw: string): ShowSessionEnvelope {
  const parsed = JSON.parse(raw);
  const s = parsed?.session ?? parsed ?? {};
  return {
    harness: String(s.harness || ""),
    id: String(s.id || ""),
    project: String(s.project || ""),
    started: s.started ? String(s.started) : undefined,
    updated: s.updated ? String(s.updated) : undefined,
    messages: Array.isArray(s.messages) ? s.messages : [],
  };
}

export function parseResumeOutput(raw: string): { command: string; cwd?: string } {
  const command =
    String(raw || "")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => l.length > 0 && !l.startsWith("deja:")) || "";
  const m = command.match(/^cd\s+((?:'[^']*'|"'")+)\s*&&\s*(.+)$/);
  if (m) {
    const tokens = m[1].match(/'[^']*'|"'"+/g) ?? [];
    const unquoted = tokens.map((t) => t.slice(1, -1)).join("");
    return { command, cwd: unquoted || undefined };
  }
  return { command };
}

export function quoteConversationMarkdown(session: ShowSessionEnvelope): string {
  const header = `# ${session.project || session.id} (${session.harness})\n\nSession ID: \`${session.id}\``;
  if (!session.messages.length) {
    return `${header}\n\n_No messages in window._`;
  }
  const blocks = session.messages.map((m) => {
    const quoted = String(m.text || "")
      .split(/\r?\n/)
      .map((line) => `> ${line}`)
      .join("\n");
    return `### ${m.role}${m.time ? ` · ${m.time}` : ""}\n\n${quoted}`;
  });
  return `${header}\n\n${blocks.join("\n\n---\n\n")}`;
}

export async function runDeja(bin: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync(bin, args, { maxBuffer: 16 * 1024 * 1024, timeout: 15000, windowsHide: true });
  return String(stdout || "");
}
