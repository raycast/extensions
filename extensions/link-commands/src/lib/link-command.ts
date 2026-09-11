import { facetsOf } from "./convention";
import type { ScriptCommand } from "./types";

/**
 * A link command is one whose body is a single `open` call. That covers everything this extension
 * generates — a URL, a folder, an app-scoped open — and matches Raycast's own sense of a Quicklink,
 * which spans all three. Detection is a body heuristic rather than a marker in the header because a
 * marker only ever applies to commands created from now on, and most of a collection predates it.
 *
 * The heuristic over-matches by design: a hand-written script that happens to be one `open` line is
 * a link command in every way that matters here.
 */
const OPEN_PATTERNS = [
  /^\s*open\s+-a\s+"([^"]+)"\s+"([^"]*)"\s*$/m,
  /^\s*open\s+"([^"]*)"\s*$/m,
  /^\s*open\s+(\S+)\s*$/m,
];

export type LinkTarget = {
  target: string;
  application?: string;
};

/**
 * Lines that support an `open` without being an action of their own: the shebang, comments, a
 * `source` of the environment, an assignment building the URL (the `jq … @uri` shape predates
 * `percentEncoded`), and the trailing `echo` this collection's own conventions ask for.
 */
const SUPPORTING_LINE = /^\s*(?:#|\/\/|$|source\s|[A-Za-z_][A-Za-z0-9_]*=|echo\s|print\s|local\s)/;

/** A loop or conditional means the `open` is conditional or repeated, so there is no single target. */
const CONTROL_FLOW = /^\s*(?:for|while|until|if|case)\b/m;

const codeLines = (body: string) =>
  body
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .filter((line) => !SUPPORTING_LINE.test(line));

export const linkTargetOf = (command: Pick<ScriptCommand, "body">): LinkTarget | undefined => {
  if (CONTROL_FLOW.test(command.body)) return undefined;

  const lines = codeLines(command.body);

  // Exactly one action, and that action opens something. Anything else is a script that happens to
  // open a thing rather than a link — it has no single target to show or group by.
  if (lines.length !== 1) return undefined;

  const code = lines[0];

  const withApplication = code.match(OPEN_PATTERNS[0]);
  if (withApplication) return { application: withApplication[1], target: withApplication[2] };

  const quoted = code.match(OPEN_PATTERNS[1]);
  if (quoted) return { target: quoted[1] };

  const bare = code.match(OPEN_PATTERNS[2]);
  return bare ? { target: bare[1] } : undefined;
};

export const isLinkCommand = (command: Pick<ScriptCommand, "body">) => linkTargetOf(command) !== undefined;

const hostOf = (target: string) => {
  try {
    return new URL(target).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return undefined;
  }
};

/**
 * Domain → package, learned from the commands already on disk. A derived name gets the casing and
 * the product wrong often enough to be a nuisance — `atlassian.net` is `Jira`, `npmjs.com` is `npm`,
 * `my.pcloud.com` is `pCloud` — and the collection already holds the right answer for every service
 * it has seen. Deriving from the domain stays as the fallback for a service seen for the first time.
 */
export const learnedPackages = (commands: ScriptCommand[]) => {
  const byHost = new Map<string, Map<string, number>>();

  for (const command of commands) {
    const link = linkTargetOf(command);
    if (!link) continue;

    const host = hostOf(link.target);
    const brand = facetsOf(command).brand;
    if (!host || !brand) continue;

    const counts = byHost.get(host) ?? new Map<string, number>();
    counts.set(brand, (counts.get(brand) ?? 0) + 1);
    byHost.set(host, counts);
  }

  // A host can carry more than one package across a collection; the most-used wins, since that is
  // the one the collection has settled on.
  const learned = new Map<string, string>();
  for (const [host, counts] of byHost) {
    const [best] = [...counts.entries()].sort(([, left], [, right]) => right - left);
    if (best) learned.set(host, best[0]);
  }

  return learned;
};

/** Walks up the domain, so `sonymusic-pde.datadoghq.com` finds what `datadoghq.com` was filed under. */
export const packageForTarget = (target: string, learned: Map<string, string>) => {
  const host = hostOf(target);
  if (!host) return undefined;

  const labels = host.split(".");
  for (let index = 0; index < labels.length - 1; index += 1) {
    const candidate = labels.slice(index).join(".");
    const match = learned.get(candidate);
    if (match) return match;
  }

  return undefined;
};
