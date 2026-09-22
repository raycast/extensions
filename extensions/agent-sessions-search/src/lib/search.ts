import { getDb, rowToState } from "./db";
import { claudeDesktopState, type ClaudeDesktopState } from "./desktop";
import { isIssueKey, summarizeRefs } from "./refs";
import { AgentId, RefEntry, SessionHit, SessionState } from "./types";

/**
 * Query understanding + ranking.
 *
 *  1. Parse the query into structured intents: PR number (832, #832, PR 832, GitHub PR URL),
 *     Linear issue keys (ZAP-1793), plus free text.
 *  2. Free text goes through FTS5 (BM25 per message, aggregated per session; tool lines are
 *     down-weighted, the synthetic title/branch/repo doc is up-weighted). Two stages like
 *     Threadlens: AND with prefix on the last term, then OR if the AND stage is thin.
 *  3. Structured refs (Claude pr-link records, branch names, URLs, mentions) add large boosts so a
 *     session that *worked on* PR #832 outranks one that merely mentions "832".
 *  4. Title substring / prefix / exact match adds a graded boost (10–22) so a session named after
 *     the query outranks one that merely repeats the term in its branch or cwd.
 *  5. Recency boost (up to 6, ~3-week half-life); empty query = most recently active sessions.
 *  6. Sessions pinned in the Claude Desktop sidebar get a fixed boost and are listed first on an
 *     empty query, mirroring the sidebar.
 *  7. Archived sessions (Codex archived_sessions/ or Claude Desktop `isArchived`) get a fixed
 *     penalty and are listed last on an empty query.
 */

export interface ParsedQuery {
  raw: string;
  pr: { number: string; repo: string | null } | null;
  linear: string[];
  text: string;
}

const GH_PR_URL = /https?:\/\/(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+)\/pull\/(\d{1,7})(?:[/?#]\S*)?/i;
const PR_QUERY = /^(?:pr|pull|pull request)?\s*#?(\d{2,7})$/i;
const LINEAR_KEY = /\b([A-Za-z][A-Za-z0-9]{1,9}-\d{1,6})\b/g;

export function parseQuery(raw: string): ParsedQuery {
  const q = raw.trim();
  const out: ParsedQuery = { raw: q, pr: null, linear: [], text: q };
  if (!q) return out;
  const url = GH_PR_URL.exec(q);
  if (url) {
    out.pr = { number: url[3], repo: `${url[1]}/${url[2]}`.toLowerCase() };
    out.text = q.replace(url[0], " ").trim() || url[3];
    return out;
  }
  const pr = PR_QUERY.exec(q);
  if (pr) {
    out.pr = { number: pr[1], repo: null };
    out.text = pr[1];
    return out;
  }
  const linear = [...q.matchAll(LINEAR_KEY)].map((m) => m[1].toUpperCase()).filter(isIssueKey);
  if (linear.length > 0) out.linear = [...new Set(linear)];
  // "PR 832 payments" style mixed queries: keep PR intent, search the rest as text too.
  const mixed = /\b(?:pr|pull)[-_ ]?#?(\d{2,7})\b|(?<![\w/#])#(\d{2,7})\b/i.exec(q);
  if (mixed) out.pr = { number: mixed[1] ?? mixed[2], repo: null };
  return out;
}

/** Turn free text into an FTS5 MATCH expression. Tokens are quoted so operators/punctuation are safe. */
export function toFtsMatch(text: string, mode: "and" | "or", prefixLast: boolean): string | null {
  const terms = text.split(/\s+/).filter(Boolean);
  const parts: string[] = [];
  terms.forEach((term, i) => {
    const tokens = term.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    if (tokens.length === 0) return;
    const isLast = i === terms.length - 1;
    const phrase = `"${tokens.join(" ").replace(/"/g, '""')}"`;
    const lastTok = tokens[tokens.length - 1];
    const usePrefix = prefixLast && isLast && lastTok.length >= 3 && !/^\d+$/.test(lastTok);
    parts.push(usePrefix ? `${phrase} *` : phrase);
  });
  if (parts.length === 0) return null;
  return parts.join(mode === "and" ? " AND " : " OR ");
}

interface FtsRow {
  session_id: string;
  score: number;
  snippet: string;
  hits: number;
}

function runFts(match: string, limit: number): FtsRow[] {
  const sql = `
    SELECT m.session_id AS session_id,
           min(h.r * CASE m.role WHEN 'tool' THEN 0.5 WHEN 'meta' THEN 1.6 ELSE 1 END) AS score,
           h.snip AS snippet,
           count(*) AS hits
    FROM (SELECT rowid, bm25(messages_fts) AS r, snippet(messages_fts, 0, '**', '**', ' … ', 18) AS snip
          FROM messages_fts WHERE messages_fts MATCH ? ORDER BY r LIMIT ?) h
    JOIN messages m ON m.id = h.rowid
    GROUP BY m.session_id`;
  try {
    return getDb().prepare(sql).all(match, limit) as unknown as FtsRow[];
  } catch {
    return [];
  }
}

interface Candidate {
  text: number;
  hits: number;
  snippet: string | null;
  refBoost: number;
  why: string[];
}

function candidate(map: Map<string, Candidate>, id: string): Candidate {
  let c = map.get(id);
  if (!c) map.set(id, (c = { text: 0, hits: 0, snippet: null, refBoost: 0, why: [] }));
  return c;
}

function applyRefs(map: Map<string, Candidate>, kind: "pr" | "linear", value: string, label: string) {
  const rows = getDb()
    .prepare(`SELECT session_id, source, weight FROM refs WHERE kind = ? AND value = ?`)
    .all(kind, value) as { session_id: string; source: string; weight: number }[];
  const per = new Map<string, { w: number; sources: Set<string> }>();
  for (const r of rows) {
    const e = per.get(r.session_id) ?? { w: 0, sources: new Set<string>() };
    e.w += r.weight;
    e.sources.add(r.source);
    per.set(r.session_id, e);
  }
  for (const [id, e] of per) {
    const c = candidate(map, id);
    c.refBoost += e.w;
    const src = [...e.sources]
      .map(
        (s) => ({ link: "linked", branch: "branch", user: "you mentioned", assistant: "assistant mentioned" })[s] ?? s,
      )
      .join(", ");
    c.why.push(`${label} (${src})`);
  }
}

/** Enough to beat sibling sessions with the same title, not enough to beat a title match. */
const PIN_BOOST = 8;

/** Roughly cancels the recency boost, so an archived session ranks like a stale one. */
const ARCHIVE_PENALTY = -6;

function isPinned(state: SessionState, desktop: ClaudeDesktopState): boolean {
  return state.agent === "claude" && desktop.pinned.has(state.sessionId);
}

/** Codex archive state is indexed (archived_sessions/ + threads.archived); Claude's lives in the desktop app. */
function isArchived(state: SessionState, desktop: ClaudeDesktopState): boolean {
  return state.archived || (state.agent === "claude" && desktop.archived.has(state.sessionId));
}

function recencyBoost(updatedAt: number | null): number {
  if (!updatedAt) return 0;
  const days = (Date.now() - updatedAt) / 86400000;
  return 6 * Math.exp(-days / 21);
}

/**
 * Normalise a title, branch or query for substring matching: lower-case, split camelCase
 * ("torProxy" → "tor proxy") and collapse every run of separators to one space, so
 * "tor proxy" matches "torProxy", "tor-proxy" and "tor_proxy" alike.
 */
export function normalizeForMatch(s: string): string {
  return s
    .replace(/(\p{Ll}|\p{N})(\p{Lu})/gu, "$1 $2")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/**
 * Title boost: a title that *is* the query beats one that starts with it, which beats one that
 * merely contains it. Scaled so a title hit dominates BM25 differences caused by the branch or
 * cwd repeating a term in the meta doc. Both sides are separator-normalised.
 */
function titleBoost(title: string | null, needle: string): number {
  const t = normalizeForMatch(title ?? "");
  if (!needle || !t.includes(needle)) return 0;
  const idx = t.indexOf(needle);
  const wordStart = idx === 0 || t[idx - 1] === " ";
  const wordEnd = idx + needle.length >= t.length || t[idx + needle.length] === " ";
  if (t === needle) return 22;
  let b = 10;
  if (wordStart && wordEnd) b += 3;
  if (idx === 0) b += 3;
  // Reward query coverage of the title ("activity" covers most of "Activity report").
  b += 4 * (needle.length / t.length);
  return b;
}

interface SearchOptions {
  agent?: AgentId | "all";
  limit?: number;
}

export function searchSessions(rawQuery: string, opts: SearchOptions = {}): SessionHit[] {
  const db = getDb();
  const limit = opts.limit ?? 60;
  const agentFilter = opts.agent && opts.agent !== "all" ? opts.agent : null;
  const parsed = parseQuery(rawQuery);
  const candidates = new Map<string, Candidate>();
  const desktop = claudeDesktopState();

  if (!parsed.raw) {
    const where = `hidden = 0 ${agentFilter ? "AND agent = ?" : ""}`;
    const args = agentFilter ? [agentFilter] : [];
    const rows = db
      .prepare(`SELECT * FROM sessions WHERE ${where} ORDER BY updated_at DESC LIMIT ?`)
      .all(...args, limit) as never[];
    // Pinned sessions are listed first regardless of age, so fetch them separately when older than the page.
    const pinnedIds = [...desktop.pinned].filter(
      (id) => !rows.some((r) => (r as { session_id: string }).session_id === id),
    );
    if (pinnedIds.length) {
      rows.push(
        ...(db
          .prepare(
            `SELECT * FROM sessions WHERE ${where} AND agent = 'claude' AND session_id IN (${pinnedIds.map(() => "?").join(",")})`,
          )
          .all(...args, ...pinnedIds) as never[]),
      );
    }
    const hits = rows.map((r) => {
      const state = rowToState(r);
      const pin = isPinned(state, desktop);
      const archived = isArchived(state, desktop);
      return toHit(state, pin ? 1 : archived ? -1 : 0, null, [], pin, archived);
    });
    // Pinned first, archived last, otherwise the original recency order (stable sort).
    hits.sort((a, b) => b.score - a.score);
    return hits;
  }

  // 1. Free text via FTS (AND stage, then OR stage when thin).
  if (parsed.text) {
    const andMatch = toFtsMatch(parsed.text, "and", true);
    if (andMatch) {
      for (const r of runFts(andMatch, 4000)) {
        const c = candidate(candidates, r.session_id);
        c.text = Math.max(c.text, Math.min(-r.score, 14));
        c.hits = r.hits;
        c.snippet = r.snippet;
      }
      const terms = parsed.text.split(/\s+/).filter(Boolean);
      if (terms.length > 1 && candidates.size < 15) {
        const orMatch = toFtsMatch(parsed.text, "or", true);
        if (orMatch) {
          for (const r of runFts(orMatch, 4000)) {
            if (candidates.has(r.session_id)) continue;
            const c = candidate(candidates, r.session_id);
            c.text = Math.min(-r.score, 14) * 0.45;
            c.hits = r.hits;
            c.snippet = r.snippet;
            c.why.push("partial match");
          }
        }
      }
    }
    // Direct substring hits on title / branch (catches things FTS tokenisation misses). The SQL
    // LIKE is a loose prefilter ("%tor%proxy%") so separators never hide a hit; the exact,
    // separator-normalised check happens in titleBoost / on the normalised branch.
    const needle = normalizeForMatch(parsed.text);
    if (needle.length > 2) {
      const like = `%${needle.replace(/[%_]/g, "").split(" ").join("%")}%`;
      const rows = db
        .prepare(
          `SELECT id, branch, title FROM sessions WHERE hidden = 0 AND (lower(branch) LIKE ? OR lower(title) LIKE ?) LIMIT 200`,
        )
        .all(like, like) as { id: string; branch: string | null; title: string | null }[];
      for (const r of rows) {
        // Branch names usually restate the title, so the two are not additive: take the best.
        const tb = titleBoost(r.title, needle);
        const bb = normalizeForMatch(r.branch ?? "").includes(needle) ? 12 : 0;
        if (tb === 0 && bb === 0) continue;
        const c = candidate(candidates, r.id);
        c.refBoost += Math.max(tb, bb);
        if (tb > 0) c.why.push(tb >= 22 ? "title is the query" : "title matches");
        if (bb > 0) c.why.push("branch matches");
      }
    }
  }

  // 2. Structured refs.
  if (parsed.pr) {
    applyRefs(candidates, "pr", parsed.pr.number, `PR #${parsed.pr.number}`);
    if (parsed.pr.repo) {
      const rows = db
        .prepare(
          `SELECT session_id, sum(weight) AS w FROM refs WHERE kind = 'pr_repo' AND value = ? GROUP BY session_id`,
        )
        .all(`${parsed.pr.repo}#${parsed.pr.number}`) as { session_id: string; w: number }[];
      for (const r of rows) {
        const c = candidate(candidates, r.session_id);
        c.refBoost += 15;
        c.why.push(`same repository`);
      }
    }
  }
  for (const key of parsed.linear) applyRefs(candidates, "linear", key, key);

  if (candidates.size === 0) return [];

  // 3. Load session rows and score.
  const ids = [...candidates.keys()];
  const hits: SessionHit[] = [];
  const chunk = 400;
  for (let i = 0; i < ids.length; i += chunk) {
    const slice = ids.slice(i, i + chunk);
    const rows = db
      .prepare(
        `SELECT * FROM sessions WHERE hidden = 0 AND id IN (${slice.map(() => "?").join(",")}) ${agentFilter ? "AND agent = ?" : ""}`,
      )
      .all(...slice, ...(agentFilter ? [agentFilter] : []));
    for (const row of rows) {
      const state = rowToState(row as never);
      const c = candidates.get(state.id)!;
      if (parsed.pr && parsed.pr.repo && state.repo && state.repo.toLowerCase() === parsed.pr.repo) {
        c.refBoost += 8;
      }
      const hitsBonus = Math.min(Math.log2(c.hits + 1), 3);
      const pin = isPinned(state, desktop);
      const archived = isArchived(state, desktop);
      if (pin) c.why.push("pinned");
      if (archived) c.why.push("archived");
      const score =
        c.text +
        hitsBonus +
        c.refBoost +
        recencyBoost(state.updatedAt) +
        (pin ? PIN_BOOST : 0) +
        (archived ? ARCHIVE_PENALTY : 0);
      hits.push(toHit(state, score, c.snippet, c.why, pin, archived));
    }
  }
  hits.sort((a, b) => b.score - a.score || (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  const top = hits.slice(0, limit);
  attachRefs(top);
  return top;
}

function attachRefs(hits: SessionHit[]) {
  if (hits.length === 0) return;
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT session_id, kind, value, source, weight FROM refs WHERE session_id IN (${hits.map(() => "?").join(",")})`,
    )
    .all(...hits.map((h) => h.id)) as unknown as (RefEntry & { session_id: string })[];
  const grouped = new Map<string, RefEntry[]>();
  for (const r of rows) {
    const arr = grouped.get(r.session_id) ?? [];
    arr.push(r);
    grouped.set(r.session_id, arr);
  }
  for (const h of hits) {
    const s = summarizeRefs(grouped.get(h.id) ?? [], 25);
    h.prNumbers = s.prNumbers.slice(0, 4);
    h.linearKeys = s.linearKeys.slice(0, 4);
    h.prRepos = Object.fromEntries(s.prRepos);
  }
}

function toHit(
  s: SessionState,
  score: number,
  snippet: string | null,
  why: string[],
  pinned: boolean,
  archived: boolean,
): SessionHit {
  return {
    id: s.id,
    agent: s.agent,
    sessionId: s.sessionId,
    file: s.file,
    title: s.title ?? s.firstPrompt ?? "(untitled session)",
    cwd: s.cwd,
    repo: s.repo,
    repoRoot: s.repoRoot,
    branch: s.branch,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    messageCount: s.messageCount,
    firstPrompt: s.firstPrompt,
    lastPrompt: s.lastPrompt,
    entrypoint: s.entrypoint,
    archived,
    pinned,
    prNumbers: [],
    linearKeys: [],
    prRepos: {},
    score,
    snippet,
    why,
  };
}

/** Recent sessions get their refs attached too (for the PR tag in the list). */
export function recentSessions(agent: AgentId | "all", limit = 80): SessionHit[] {
  const hits = searchSessions("", { agent, limit });
  attachRefs(hits);
  return hits;
}
