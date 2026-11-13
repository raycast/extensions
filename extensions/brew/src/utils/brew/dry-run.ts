/**
 * Read the plan `brew install --dry-run` prints.
 *
 * `brew install` has no `--json`, so this is a line parser over the `ohai`
 * headers brew emits. Two printing styles arrive in the same output:
 *
 * - `puts names.join(" ")` — the formula/cask section and a CASK's dependency
 *   section, so several names land on ONE line (`install.rb:374,540,566`).
 * - `Upgrade.format_upgrade_summary` — a FORMULA's dependency sections and the
 *   dependents block, one entry per line, columnised as `name  old -> new`
 *   (`upgrade.rb:419-431`).
 *
 * Pure by design (no `@raycast/api`) so it is testable against real captures;
 * see `dry-run.test.ts`. Any wording change in a future Homebrew yields an
 * empty plan rather than a wrong one, and the count guard below flags the
 * partial case.
 */

/** One package in a section — with versions when brew printed them. */
export interface DryRunEntry {
  name: string;
  from?: string;
  to?: string;
}

/** One `==> Would …:` block. */
export interface DryRunSection {
  verb: "install" | "upgrade" | "reinstall";
  noun: "formula" | "cask" | "dependency" | "dependent";
  /** Homebrew's own N from the header, kept so a short list can be flagged. */
  count: number;
  /** The `… for neovim` the dependency headers carry. */
  for?: string;
  entries: DryRunEntry[];
}

const HEADER =
  /^==> Would (install|upgrade|reinstall) (\d+) (formula|formulae|cask|casks|dependency|dependencies|dependent|dependents)(?: for (\S+))?(?: of upgraded formulae?)?:$/;

const NOUNS = {
  formula: "formula",
  formulae: "formula",
  cask: "cask",
  casks: "cask",
  dependency: "dependency",
  dependencies: "dependency",
  dependent: "dependent",
  dependents: "dependent",
} as const;

/** Read the entries on one line of a section. */
function parseEntryLine(line: string): DryRunEntry[] {
  const tokens = line.trim().split(/\s+/);
  if (tokens.length === 4 && tokens[2] === "->") {
    return [{ name: tokens[0], from: tokens[1], to: tokens[3] }];
  }
  // A non-optlinked formula prints `name version` with no arrow
  // (`upgrade.rb:424-428`). Only a leading digit tells that apart from two
  // space-joined cask names — good enough, since versions start with one and
  // package names essentially never do.
  // ponytail: digit heuristic; needs brew to print a delimiter to do better.
  if (tokens.length === 2 && /^\d/.test(tokens[1])) {
    return [{ name: tokens[0], to: tokens[1] }];
  }
  return tokens.map((name) => ({ name }));
}

/** Read the plan out of `brew install --dry-run` stdout. */
export function parseDryRun(stdout: string): DryRunSection[] {
  const sections: DryRunSection[] = [];
  let open: DryRunSection | undefined;

  for (const line of stdout.split("\n")) {
    const header = HEADER.exec(line);
    if (header) {
      open = {
        verb: header[1] as DryRunSection["verb"],
        noun: NOUNS[header[3] as keyof typeof NOUNS],
        count: Number(header[2]),
        for: header[4],
        entries: [],
      };
      sections.push(open);
      continue;
    }
    // Any other `==>` line (`Downloading …`) ends the block; so does anything
    // before the first header (`aom 3.14.1 is already installed but …`).
    if (line.startsWith("==>")) {
      open = undefined;
      continue;
    }
    if (!open || line.trim() === "") {
      continue;
    }
    open.entries.push(...parseEntryLine(line));
  }

  return sections;
}

/* ------------------------------------------------------------------ *
 * `brew upgrade --dry-run` — the whole-machine plan.
 * ------------------------------------------------------------------ */

/** One row of the upgrade table. `bytes` is absent when brew printed no size. */
export interface UpgradeDryRunEntry {
  /** Verbatim, tap prefix included (`steipete/tap/birdclaw`). */
  name: string;
  from: string;
  to: string;
  /** Approximate: brew only prints the rounded string. See `parseBrewSize`. */
  bytes?: number;
}

export interface UpgradeDryRunPlan {
  entries: UpgradeDryRunEntry[];
  /**
   * Brew's `Warning:` blocks as markdown: the hard-wrapped prose unwrapped back
   * into one sentence, and any packages brew listed under it as a `- name` list
   * below a blank line. Render these in a `Detail`, never as a list row title —
   * a row collapses the newlines back into the run-on this avoids.
   */
  warnings: string[];
  /** Sum over the rows that carried a size; sizeless rows contribute nothing. */
  totalBytes: number;
}

/**
 * Brew's units are powers of **1000**, not 1024 (`utils/formatter.rb:183-193`),
 * and it drops the decimal only when the value is whole (`:196-204`).
 */
const SIZE_UNITS = ["B", "KB", "MB", "GB"] as const;

/** `757KB` → 757000. Undefined for anything that is not one of brew's sizes. */
function parseBrewSize(text: string): number | undefined {
  const match = /^(\d+(?:\.\d+)?)(B|KB|MB|GB)$/.exec(text);
  if (!match) return undefined;
  return Number(match[1]) * 1000 ** SIZE_UNITS.indexOf(match[2] as (typeof SIZE_UNITS)[number]);
}

/**
 * The inverse, printing the units brew prints so a total reads like a row.
 *
 * This MIRRORS `Formatter.disk_usage_readable` (`utils/formatter.rb:181-204`)
 * step for step, including the order that looks wrong: the unit is chosen from
 * the UNROUNDED value, and the decimal is kept whenever the unrounded value is
 * fractional. That is why 999950 bytes prints `1000.0KB` and not `1KB` — brew
 * prints it that way. Do not "fix" this toward powers of 1024 or toward
 * rounding before the unit choice; it would then disagree with the row
 * accessories, which are brew's own strings.
 *
 * Round-tripping is lossy in brew's direction, not ours: brew prints `3.0MB`
 * for a bottle that is 2999-and-change KB, so a parsed total is accurate to
 * roughly a tenth of a unit per row.
 */
export function formatBrewSize(bytes: number): string {
  let size = bytes;
  let unit = 0;
  while (Math.abs(size) >= 1000 && unit < SIZE_UNITS.length - 1) {
    size /= 1000;
    unit += 1;
  }
  // `((size * 10).to_i % 10).zero?` — truncation, not rounding, and `to_i`
  // truncates toward zero, which is `Math.trunc`.
  const whole = Math.trunc(size * 10) % 10 === 0;
  return `${whole ? Math.trunc(size) : size.toFixed(1)}${SIZE_UNITS[unit]}`;
}

/** Brew ends a wrapped `Warning:` at a heading, a table row, or a blank line. */
function endsWarning(line: string): boolean {
  return line.trim() === "" || line.startsWith("==>") || line.includes(" -> ");
}

/** A `Warning:` being read: the wrapped prose, and the packages listed under it. */
interface OpenWarning {
  sentence: string[];
  items: string[];
}

/** The sentence, then a markdown list — so a Detail view renders it as one. */
function formatWarning({ sentence, items }: OpenWarning): string {
  const prose = sentence.join(" ");
  return items.length === 0 ? prose : `${prose}\n\n${items.map((item) => `- ${item}`).join("\n")}`;
}

/**
 * Read the plan out of `brew upgrade --dry-run`.
 *
 * Accepts stdout, or stdout and stderr concatenated — the two regions this
 * skips live on stderr (`download_queue.rb:120` prints the `==> Downloading
 * bottle manifests` heading and `:458` the `✔︎ Bottle Manifest …` lines, both
 * `$stderr.puts`), while the table and its `==>` heading are stdout
 * (`cmd/upgrade.rb:975-981`, `oh1` + `puts`).
 *
 * Rows are split on the ` -> ` separator rather than by column, because
 * `Upgrade.format_upgrade_summary` pads `name` and `old_version` to the widest
 * of the batch (`upgrade.rb:31-41`) — and skips padding entirely for a batch
 * of one (`upgrade.rb:29`), so the single-package form has one space.
 */
export function parseUpgradeDryRun(stdout: string): UpgradeDryRunPlan {
  const entries: UpgradeDryRunEntry[] = [];
  const warnings: string[] = [];
  let warning: OpenWarning | undefined;

  for (const line of stdout.split("\n")) {
    // A new `Warning:` is a boundary, not continuation text: brew emits
    // consecutive warnings while evaluating several casks, and treating the
    // second as a wrapped line of the first folds both into one entry.
    const startsWarning = line.startsWith("Warning:");
    if (warning && !startsWarning && !endsWarning(line)) {
      // Indentation is brew's own discriminator: it hard-wraps prose with an
      // UNINDENTED continuation, and prints the packages a warning is about
      // two-space indented below it. Unwrapping both folds the list into the
      // sentence and reads as a run-on.
      (/^\s/.test(line) ? warning.items : warning.sentence).push(line.trim());
      continue;
    }
    if (warning) {
      warnings.push(formatWarning(warning));
      warning = undefined;
    }
    if (startsWarning) {
      warning = { sentence: [line.slice("Warning:".length).trim()], items: [] };
      continue;
    }
    const arrow = line.indexOf(" -> ");
    if (arrow === -1) continue; // headings and the `✔︎ Bottle Manifest …` region

    const [name, ...fromParts] = line.slice(0, arrow).trim().split(/\s+/);
    const from = fromParts.join(" ");
    if (!name || !from) continue;

    // A trailing ` (11MB)` is the download size; casks and unbottled formulae
    // have none (`cmd/upgrade.rb:996-1005` returns "" without a bottle).
    const rest = line.slice(arrow + 4).trim();
    const sized = /^(\S+) \(([^)]+)\)$/.exec(rest);
    entries.push({
      name,
      from,
      to: sized ? sized[1] : rest,
      bytes: sized ? parseBrewSize(sized[2]) : undefined,
    });
  }
  if (warning) warnings.push(formatWarning(warning));

  return { entries, warnings, totalBytes: entries.reduce((sum, e) => sum + (e.bytes ?? 0), 0) };
}
