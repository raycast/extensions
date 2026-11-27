// One card moved into place in a workflow the viewer already has, by editing its text: the
// file keeps its comments, its other steps, its pins and its quoting, and only the lines that
// carry the card change. A card is drawn by the step that names it (`profile:` or a line of
// `repos:`), in that step's theme and options; to draw it another way it leaves its step and
// joins one already drawing that way, or a new step after the last, written like the others.

/** How a step draws its cards: what changes their files or their drawing. */
export interface Drawing {
  /** The `theme` input, `both` when absent. */
  theme: string;
  calendar: string;
  stars: string;
  /** The `sections` input, in the card's order; `all` when absent. */
  sections: string;
}

export type CardRef = { kind: "profile"; login: string } | { kind: "repo"; full: string };

export interface Patched {
  text: string;
  /** What was done, one sentence each, for the viewer. */
  changes: string[];
  /** The step's `out-dir`, for the embed's paths. */
  outDir: string;
}

interface Entry {
  key: string;
  start: number;
  end: number;
  /** The inline value, quotes and comment stripped; for a block, its lines. */
  value: string;
  block: string[] | null;
}

interface Step {
  start: number;
  end: number;
  dash: number;
  usesLine: number;
  withLine: number;
  keyIndent: number;
  entries: Entry[];
}

const indentOf = (line: string) => line.length - line.trimStart().length;
const blank = (line: string) => line.trim() === "";
const comment = (line: string) => line.trimStart().startsWith("#");
// A step's own `uses:` line: a commented-out one is no step.
const GLANCECARD = /^\s*(?:-\s+)?uses:\s*["']?gfazioli\/glancecard@/;

function inlineValue(raw: string): string {
  const v = raw.trim();
  const quoted = v.match(/^(["'])(.*?)\1/);
  if (quoted) return quoted[2];
  return v.replace(/\s+#.*$/, "").trim();
}

/** Every step that uses glancecard, with its inputs. */
function parseSteps(lines: string[]): Step[] {
  const steps: Step[] = [];
  lines.forEach((line, i) => {
    if (!GLANCECARD.test(line)) return;
    // The step begins at the `- ` line at or above its `uses:`.
    let start = i;
    while (start >= 0 && !/^\s*-\s/.test(lines[start])) start--;
    if (start < 0) return;
    const dash = indentOf(lines[start]);
    // A comment belongs to the step while the next line that is not one is still the step's.
    const inStep = (k: number) => {
      let n = k;
      while (n < lines.length && (blank(lines[n]) || comment(lines[n]))) n++;
      return n < lines.length && indentOf(lines[n]) > dash;
    };
    let end = start + 1;
    while (
      end < lines.length &&
      (blank(lines[end]) || indentOf(lines[end]) > dash || (comment(lines[end]) && inStep(end)))
    )
      end++;
    while (end > start + 1 && blank(lines[end - 1])) end--;

    let withLine = -1;
    for (let j = start; j < end; j++) if (/^\s*(?:-\s+)?with:\s*(?:#.*)?$/.test(lines[j])) withLine = j;
    const entries: Entry[] = [];
    let keyIndent = dash + 4;
    if (withLine >= 0) {
      // The `with:` block ends where a line comes back to its key's column (an `env:` after it, say).
      const withColumn = lines[withLine].indexOf("with:");
      let withEnd = withLine + 1;
      while (
        withEnd < end &&
        (blank(lines[withEnd]) || comment(lines[withEnd]) || indentOf(lines[withEnd]) > withColumn)
      )
        withEnd++;
      const first = lines.slice(withLine + 1, withEnd).find((l) => !blank(l) && !comment(l));
      keyIndent = first ? indentOf(first) : withColumn + 2;
      for (let j = withLine + 1; j < withEnd; j++) {
        const m = lines[j].match(/^(\s*)([A-Za-z0-9_-]+):\s*(.*)$/);
        if (!m || m[1].length !== keyIndent) continue;
        let e = j + 1;
        while (e < withEnd && (blank(lines[e]) || indentOf(lines[e]) > keyIndent)) e++;
        while (e > j + 1 && blank(lines[e - 1])) e--;
        const isBlock = /^[|>][-+]?\s*(?:#.*)?$/.test(m[3].trim());
        const block = isBlock
          ? lines
              .slice(j + 1, e)
              .map((l) => l.trim())
              .filter((l) => l && !l.startsWith("#"))
          : null;
        entries.push({ key: m[2], start: j, end: e, value: isBlock ? block!.join("\n") : inlineValue(m[3]), block });
      }
    }
    steps.push({ start, end, dash, usesLine: i, withLine, keyIndent, entries });
  });
  return steps;
}

const get = (s: Step, key: string) => s.entries.find((e) => e.key === key) ?? null;
const listOf = (s: Step, key: string) => {
  const e = get(s, key);
  if (!e) return [];
  return (e.block ?? e.value.split(/[\s,]+/)).map((v) => v.trim()).filter(Boolean);
};

const SECTION_ORDER = ["hero", "tiles", "activity", "stars", "rhythm", "code", "commits", "releases", "contributors"];

/** A theme input as the set of files it writes: `both` is dark and light, order does not matter. */
const themeKey = (value: string) =>
  [
    ...new Set(
      value
        .toLowerCase()
        .split(/[\s,]+/)
        .filter(Boolean)
        .flatMap((v) => (v === "both" ? ["dark", "light"] : [v])),
    ),
  ]
    .sort()
    .join(",");

const sectionsKey = (value: string) => {
  const list = value.split(/[\s,]+/).filter(Boolean);
  if (!list.length || list.includes("all") || SECTION_ORDER.every((s) => list.includes(s))) return "all";
  return SECTION_ORDER.filter((s) => list.includes(s)).join(",");
};

function drawingOf(s: Step): Drawing {
  return {
    theme: get(s, "theme")?.value || "both",
    calendar: get(s, "calendar")?.value || "chart",
    stars: get(s, "stars-chart")?.value || "steps",
    sections: get(s, "sections")?.value || "all",
  };
}

/** Whether a step draws a card the way asked: the profile card ignores the repository sections but needs its stars. */
function draws(s: Step, want: Drawing, kind: CardRef["kind"]): boolean {
  const have = drawingOf(s);
  if (
    themeKey(have.theme) !== themeKey(want.theme) ||
    !same(have.calendar, want.calendar) ||
    !same(have.stars, want.stars)
  )
    return false;
  if (kind === "profile") return sectionsKey(have.sections) === "all";
  return sectionsKey(have.sections) === sectionsKey(want.sections);
}

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
const holds = (s: Step, card: CardRef) =>
  card.kind === "profile"
    ? same(get(s, "profile")?.value ?? "", card.login) ||
      /github\.repository_owner/.test(get(s, "profile")?.value ?? "")
    : listOf(s, "repos").some((r) => same(r, card.full));

const name = (card: CardRef) => (card.kind === "profile" ? "the profile card" : card.full);

/** `lines` with the step's `key` set to `value` (one line), or removed when `value` is null. */
function setInput(lines: string[], s: Step, key: string, value: string | null): string[] {
  const e = get(s, key);
  const line = (v: string) => `${" ".repeat(s.keyIndent)}${key}: ${v}`;
  if (e) return [...lines.slice(0, e.start), ...(value === null ? [] : [line(value)]), ...lines.slice(e.end)];
  if (value === null) return lines;
  const at = s.entries.length ? Math.max(...s.entries.map((x) => x.end)) : s.withLine + 1;
  return [...lines.slice(0, at), line(value), ...lines.slice(at)];
}

/** `lines` with the step's `repos` set to `repos`, as a block (or the one line it was), or removed when empty. */
function setRepos(lines: string[], s: Step, repos: string[]): string[] {
  const e = get(s, "repos");
  if (!repos.length) return setInput(lines, s, "repos", null);
  if (e && !e.block && repos.length === 1) return setInput(lines, s, "repos", repos[0]);
  const pad = " ".repeat(s.keyIndent);
  const block = [`${pad}repos: |`, ...repos.map((r) => `${pad}  ${r}`)];
  if (e) return [...lines.slice(0, e.start), ...block, ...lines.slice(e.end)];
  const at = s.entries.length ? Math.max(...s.entries.map((x) => x.end)) : s.withLine + 1;
  return [...lines.slice(0, at), ...block, ...lines.slice(at)];
}

/** `lines` without the step, nor the comment lines right above it, which were about it. */
function removeStep(lines: string[], s: Step): string[] {
  let from = s.start;
  while (from > 0 && comment(lines[from - 1]) && indentOf(lines[from - 1]) === s.dash) from--;
  return [...lines.slice(0, from), ...lines.slice(s.end)];
}

/** The inputs a new step copies from the first one: the ones every step must agree on. */
const SHARED = ["time-zone", "out-dir", "commit-message", "token", "allow-private", "commit"];

/** A new step drawing `card` the way asked, written like the workflow's last glancecard step. */
function newStep(lines: string[], all: Step[], card: CardRef, want: Drawing): string[] {
  const last = all[all.length - 1];
  const first = all[0];
  const dash = " ".repeat(last.dash);
  const pad = " ".repeat(last.dash + 4);
  const uses = lines[last.usesLine].trim().replace(/^-\s+/, "");
  const out = [`${dash}- ${uses}`, `${dash}  with:`];
  out.push(card.kind === "profile" ? `${pad}profile: ${card.login}` : `${pad}repos: ${card.full}`);
  if (themeKey(want.theme) !== themeKey("both")) out.push(`${pad}theme: ${want.theme}`);
  if (want.calendar !== "chart") out.push(`${pad}calendar: ${want.calendar}`);
  if (want.stars !== "steps") out.push(`${pad}stars-chart: ${want.stars}`);
  if (card.kind === "repo" && sectionsKey(want.sections) !== "all") out.push(`${pad}sections: ${want.sections}`);
  for (const key of SHARED) {
    const e = get(first, key);
    if (e && !e.block) out.push(`${pad}${lines[e.start].trim()}`);
  }
  return out;
}

/**
 * The workflow with `card` drawn the way `want` says. A card already drawn that way leaves the
 * text as it is; otherwise it leaves its step (the step goes when it draws nothing else) and
 * joins a step that draws that way, or a new one after the last.
 */
export function placeCard(text: string, card: CardRef, want: Drawing): Patched {
  // A step written `with: { … }` on one line, or without `with:`, is not one this edits safely.
  const unsafe = parseSteps(text.split(/\r?\n/)).find((s) => s.withLine < 0);
  if (unsafe)
    throw new Error(
      "A glancecard step's inputs are not a `with:` block of their own lines: edit the workflow by hand, or start over",
    );
  // A file saved with CRLF keeps them.
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  let lines = text.split(/\r?\n/);
  const changes: string[] = [];
  let all = parseSteps(lines);
  if (!all.length) throw new Error("No glancecard step was found in the workflow");
  const outDir = get(all[0], "out-dir")?.value || "glancecard";

  const current = all.find((s) => holds(s, card));
  if (current && draws(current, want, card.kind)) return { text, changes, outDir };

  const joinable = (s: Step) => draws(s, want, card.kind) && (card.kind === "repo" || !get(s, "profile"));
  const alone =
    current &&
    (card.kind === "repo"
      ? listOf(current, "repos").length === 1 && !get(current, "profile")
      : !listOf(current, "repos").length);
  // A step drawing this card alone is redrawn where it is, its comments and place kept.
  if (current && alone && !all.some((s) => s !== current && joinable(s))) {
    const index = all.indexOf(current);
    const inputs: [string, string | null][] = [
      ["theme", themeKey(want.theme) === themeKey("both") ? null : want.theme],
      ["calendar", want.calendar === "chart" ? null : want.calendar],
      ["stars-chart", want.stars === "steps" ? null : want.stars],
    ];
    if (card.kind === "repo") inputs.push(["sections", sectionsKey(want.sections) === "all" ? null : want.sections]);
    for (const [key, value] of inputs) lines = setInput(lines, parseSteps(lines)[index], key, value);
    changes.push(`Redrew the step that draws only ${name(card)}: ${want.theme}`);
    return { text: lines.join(eol), changes, outDir };
  }

  if (current) {
    const others =
      card.kind === "repo" ? listOf(current, "repos").filter((r) => !same(r, card.full)) : listOf(current, "repos");
    const keepsProfile = card.kind === "repo" && Boolean(get(current, "profile"));
    if (!others.length && !keepsProfile) {
      lines = removeStep(lines, current);
      changes.push(`Removed the step that drew only ${name(card)}`);
    } else {
      lines = card.kind === "profile" ? setInput(lines, current, "profile", null) : setRepos(lines, current, others);
      changes.push(`Took ${name(card)} out of the step drawing ${drawingOf(current).theme}`);
    }
    all = parseSteps(lines);
  }

  const target = all.find(joinable);
  if (target) {
    lines =
      card.kind === "profile"
        ? setInput(lines, target, "profile", card.login)
        : setRepos(lines, target, [...listOf(target, "repos"), card.full]);
    changes.push(`Added ${name(card)} to the step drawing ${drawingOf(target).theme}`);
  } else {
    const last = all[all.length - 1];
    lines = [...lines.slice(0, last.end), ...newStep(lines, all, card, want), ...lines.slice(last.end)];
    changes.push(`Added a step drawing ${name(card)} in ${want.theme}`);
  }
  return { text: lines.join(eol), changes, outDir };
}

/** The repositories of the step that draws `card`, which name its files; empty when no step does. */
export function reposBeside(text: string, card: CardRef): string[] {
  const step = parseSteps(text.split(/\r?\n/)).find((s) => holds(s, card));
  return step ? listOf(step, "repos") : [];
}

/** The lines that changed, with two of context, as a unified diff's body. */
export function lineDiff(before: string, after: string): string {
  const a = before.split(/\r?\n/);
  const b = after.split(/\r?\n/);
  // Longest common subsequence: workflows are a few hundred lines at most.
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const ops: { sign: " " | "-" | "+"; line: string }[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      ops.push({ sign: " ", line: a[i++] });
      j++;
    } else if (j < b.length && (i >= a.length || dp[i][j + 1] >= dp[i + 1][j])) ops.push({ sign: "+", line: b[j++] });
    else ops.push({ sign: "-", line: a[i++] });
  }
  const keep = ops.map((_, k) => ops.slice(Math.max(0, k - 2), k + 3).some((o) => o.sign !== " "));
  const out: string[] = [];
  ops.forEach((o, k) => {
    if (keep[k]) out.push(`${o.sign} ${o.line}`);
    else if (keep[k - 1]) out.push("  …");
  });
  return out.join("\n");
}
