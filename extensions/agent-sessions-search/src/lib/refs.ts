import { RefEntry, RefKind, RefSource } from "./types";

/**
 * Structured references (PR numbers, Linear issues) extracted from session content.
 * These drive the "was this session really about PR #832?" ranking.
 */

const PR_URL_RE = /github\.com\/([\w.-]+)\/([\w.-]+)\/pull\/(\d{1,7})/gi;
const PR_MENTION_RE = /(?:\bPRs?\s*#?|\bpull requests?\s*#?|(?<![\w/#])#)(\d{2,7})\b/gi;
const LINEAR_URL_RE = /linear\.app\/([\w-]+)\/issue\/([A-Z][A-Z0-9]{1,9}-\d{1,6})/gi;

/** Linear workspace slugs seen in URLs while indexing (used to build issue links). */
export const seenLinearWorkspaces = new Map<string, number>();
const LINEAR_KEY_RE = /\b([A-Z][A-Z0-9]{1,9}-\d{1,6})\b/g;
const BRANCH_LINEAR_RE = /(?<![a-z0-9])([a-z][a-z0-9]{1,9}-\d{1,6})(?![a-z0-9])/gi;
const BRANCH_PR_RE = /(?<![a-z0-9])(?:pr|pull)[-_]?(\d{2,7})(?![a-z0-9])/gi;
const BRANCH_NUMBER_RE = /(?<![a-z0-9])(\d{2,7})(?![a-z0-9])/gi;

// Weights: link records (Claude pr-link) and branch names dominate, user mentions matter,
// assistant mentions are a weak hint. Per-source sums are capped so chatty sessions don't win.
export const REF_WEIGHTS = {
  link: 40,
  branchPr: 30,
  branchNumber: 12,
  branchLinear: 30,
  urlUser: 25,
  urlAssistant: 6,
  mentionUser: 15,
  mentionAssistant: 4,
  capUser: 45,
  capAssistant: 12,
} as const;

/** Prefixes that look like issue keys but never are (PR-3228, UTF-8, SHA-256, ...). */
export const NOT_ISSUE_PREFIXES = new Set([
  "PR",
  "PRS",
  "PRR",
  "UTF",
  "ISO",
  "SHA",
  "RFC",
  "MD",
  "GPT",
  "CVE",
  "HTTP",
  "TLS",
  "SSL",
  "RSA",
  "AES",
  "HMAC",
  "ES",
  "TS",
  "EC",
  "BIP",
  "BOLT",
  "NIP",
  "LN",
  "OP",
  "ERC",
  "EIP",
  "IEEE",
  "IPV",
  "X",
  "PIN",
  "TX",
  "V",
  "GH",
  "ISSUE",
  "TICKET",
  "STEP",
  "PHASE",
  "PART",
  "PAGE",
  "LINE",
  "ROW",
  "COL",
  "ID",
  "NO",
  "REV",
  "REVIEW",
  "PATCH",
  "TOP",
  "P",
  "Q",
  "H",
  "S",
  "M",
  "L",
  "E",
  "T",
  "N",
  "A",
  "B",
  "C",
  "D",
  "F",
  "G",
  "I",
  "J",
  "K",
  "O",
  "R",
  "U",
  "W",
  "Y",
  "Z",
  "LINGUI",
  "REACT",
  "NEXT",
  "NODE",
  "NPM",
  "PNPM",
  "YARN",
  "TYPESCRIPT",
  "MANTINE",
  "EXPO",
  "PYTHON",
]);

export function isIssueKey(key: string): boolean {
  const prefix = key.split("-")[0].toUpperCase();
  return prefix.length >= 2 && !NOT_ISSUE_PREFIXES.has(prefix);
}

export class RefCollector {
  private map = new Map<string, RefEntry>();

  constructor(existing: RefEntry[] = []) {
    for (const r of existing) this.map.set(this.key(r.kind, r.value, r.source), { ...r });
  }

  private key(kind: RefKind, value: string, source: RefSource) {
    return `${kind}|${value}|${source}`;
  }

  add(kind: RefKind, value: string, source: RefSource, weight: number, cap = Infinity) {
    const k = this.key(kind, value, source);
    const cur = this.map.get(k);
    if (cur) cur.weight = Math.min(cap, cur.weight + weight);
    else this.map.set(k, { kind, value, source, weight: Math.min(cap, weight) });
  }

  addLink(prNumber: number | string, repo?: string | null) {
    this.add("pr", String(prNumber), "link", REF_WEIGHTS.link, REF_WEIGHTS.link);
    if (repo) this.add("pr_repo", `${repo.toLowerCase()}#${prNumber}`, "link", REF_WEIGHTS.link, REF_WEIGHTS.link);
  }

  addBranch(branch: string | null | undefined) {
    if (!branch) return;
    const seenNumbers = new Set<string>();
    for (const m of branch.matchAll(BRANCH_PR_RE)) {
      seenNumbers.add(m[1]);
      this.add("pr", m[1], "branch", REF_WEIGHTS.branchPr, REF_WEIGHTS.branchPr);
    }
    for (const m of branch.matchAll(BRANCH_NUMBER_RE)) {
      if (seenNumbers.has(m[1])) continue;
      this.add("pr", m[1], "branch", REF_WEIGHTS.branchNumber, REF_WEIGHTS.branchNumber);
    }
    for (const m of branch.matchAll(BRANCH_LINEAR_RE)) {
      const key = m[1].toUpperCase();
      if (isIssueKey(key)) this.add("linear", key, "branch", REF_WEIGHTS.branchLinear, REF_WEIGHTS.branchLinear);
    }
  }

  addText(role: "user" | "assistant", text: string) {
    if (!text) return;
    const cap = role === "user" ? REF_WEIGHTS.capUser : REF_WEIGHTS.capAssistant;
    const urlW = role === "user" ? REF_WEIGHTS.urlUser : REF_WEIGHTS.urlAssistant;
    const mentionW = role === "user" ? REF_WEIGHTS.mentionUser : REF_WEIGHTS.mentionAssistant;
    const sample = text.length > 20000 ? text.slice(0, 20000) : text;
    for (const m of sample.matchAll(PR_URL_RE)) {
      this.add("pr", m[3], role, urlW, cap);
      this.add("pr_repo", `${m[1]}/${m[2]}#${m[3]}`.toLowerCase(), role, urlW, cap);
    }
    for (const m of sample.matchAll(PR_MENTION_RE)) this.add("pr", m[1], role, mentionW, cap);
    for (const m of sample.matchAll(LINEAR_URL_RE)) {
      this.add("linear", m[2].toUpperCase(), role, urlW, cap);
      seenLinearWorkspaces.set(m[1], (seenLinearWorkspaces.get(m[1]) ?? 0) + 1);
    }
    for (const m of sample.matchAll(LINEAR_KEY_RE)) if (isIssueKey(m[1])) this.add("linear", m[1], role, mentionW, cap);
  }

  entries(): RefEntry[] {
    return [...this.map.values()];
  }
}

/** Summarise refs for display: strongest PR numbers / Linear keys first. */
export function summarizeRefs(refs: RefEntry[], minWeight = 20) {
  const byKind = new Map<RefKind, Map<string, number>>();
  for (const r of refs) {
    let m = byKind.get(r.kind);
    if (!m) byKind.set(r.kind, (m = new Map()));
    m.set(r.value, (m.get(r.value) ?? 0) + r.weight);
  }
  const top = (kind: RefKind) =>
    [...(byKind.get(kind) ?? new Map<string, number>()).entries()]
      .filter(([, w]) => w >= minWeight)
      .sort((a, b) => b[1] - a[1])
      .map(([v]) => v);
  // owner/repo#n entries tell us which repository a PR number belongs to
  const prRepos = new Map<string, string>();
  for (const v of top("pr_repo")) {
    const [repo, n] = v.split("#");
    if (repo && n && !prRepos.has(n)) prRepos.set(n, repo);
  }
  return { prNumbers: top("pr"), linearKeys: top("linear"), prRepos };
}
