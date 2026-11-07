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

export function parseSearchJSON(raw: string): SearchResultEnvelope {
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) {
    return { tier: "exact", strictHits: parsed as DejaSessionHit[], nearestHits: [] };
  }
  const tier = typeof parsed?.tier === "string" ? parsed.tier : "exact";
  const hits: DejaSessionHit[] = Array.isArray(parsed?.hits) ? parsed.hits : [];
  if (tier === "relevance") {
    const strictHits = hits.filter((h) => Boolean(h?.strict));
    const nearestHits = hits.filter((h) => !h?.strict);
    return { tier, strictHits, nearestHits };
  }
  return { tier, strictHits: hits, nearestHits: [] };
}

export function parseLastJSON(raw: string): DejaSessionHit[] {
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) return parsed as DejaSessionHit[];
  if (Array.isArray(parsed?.sessions)) return parsed.sessions as DejaSessionHit[];
  if (Array.isArray(parsed?.hits)) return parsed.hits as DejaSessionHit[];
  return [];
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
  const m = command.match(/^cd\s+'([^']*(?:''[^']*)*)'\s*&&\s*(.+)$/);
  if (m) {
    return { command, cwd: m[1].replace(/''/g, "'") };
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
