/**
 * Link / unlink an installed cask's symlinked artifacts (Homebrew 7 only).
 *
 * `brew link --cask` / `brew unlink --cask` first exist in 7.0.0
 * (`Library/Homebrew/cmd/link.rb` gained `switch "--cask"` there); on 6.x the
 * flag is unknown and brew exits 1 before doing anything.
 *
 * There is no `linked` field anywhere — not in `brew info --json=v2`, not in
 * `INSTALL_RECEIPT.json` — so state is not readable. `--dry-run` is both the
 * preview AND the state check: brew prints its header once and then one
 * absolute path per artifact it would actually touch, so an empty list means
 * "already linked" / "already unlinked". Reading `fs.readlink(target)` instead
 * was rejected: a formula's symlink at the same target (`code-cli` owns
 * `/opt/homebrew/bin/code`) reads as linked but is brew's `:skip_formula`.
 *
 * The parse helpers are pure (no `@raycast/api`) so they are testable against
 * real captures; see `link.test.ts`.
 */

import { execBrew } from "./commands";
import { brewIdentifier } from "./helpers";
import type { Cask } from "../types";

export type CaskLinkVerb = "link" | "unlink";

/**
 * The cask artifact stanzas that subclass `Symlinked` and are therefore the
 * only ones link/unlink touch (`cask/artifact/{binary,manpage,shellcompletion}.rb`).
 * `generate_completions_from_executable` and `app` are NOT among them.
 */
const CASK_SYMLINK_STANZAS = ["binary", "manpage", "bash_completion", "zsh_completion", "fish_completion"] as const;

/**
 * Whether this cask has anything link/unlink could change.
 *
 * `artifacts` is the source of truth and is read first — a record straight from
 * `brew info --json=v2` always carries it. The chunked cache does not: it keeps
 * `has_symlink_artifacts`, the same answer derived at build time, because the
 * array itself more than doubled the cache (see `valid_keys` in `cache.ts`).
 *
 * `undefined` — not `false` — when neither is present (a chunk cache written
 * before the derived flag existed): unknown means offer the actions and let the
 * dry-run answer, rather than hiding a working action on missing evidence.
 */
export function caskHasSymlinkArtifacts(cask: Pick<Cask, "artifacts" | "has_symlink_artifacts">): boolean | undefined {
  if (cask.artifacts) {
    return cask.artifacts.some((artifact) =>
      CASK_SYMLINK_STANZAS.some((stanza) => Object.prototype.hasOwnProperty.call(artifact, stanza)),
    );
  }
  return cask.has_symlink_artifacts;
}

/**
 * Replace a cask's `artifacts[]` with the one bit of it the UI reads.
 *
 * Called once per record while the chunked cache is being built, on an object
 * that nothing else has seen yet — so it mutates rather than copying 7,700
 * records. A cask with no `artifacts` at all is left untouched: the field is
 * absent because the source said nothing, and writing `false` there would turn
 * "unknown" into a claim the data does not support.
 *
 * `variations` and `language_variations` go too. Neither is on the cache's
 * whitelist and nothing reads either, but `stream-json`'s filter matches PATHS
 * rather than top-level keys, so `variations.<os>.artifacts` matches on
 * `artifacts` and drags its whole parent subtree through — a second, per-OS
 * copy of the arrays, 900 KB of it across the catalogue (measured 2026-09-18).
 * Dropping the top-level array while leaving those would give most of the
 * saving back.
 */
export function compactCaskArtifacts<T extends Pick<Cask, "artifacts" | "has_symlink_artifacts">>(cask: T): T {
  const has = caskHasSymlinkArtifacts(cask);
  if (has !== undefined) cask.has_symlink_artifacts = has;
  delete cask.artifacts;
  const leaked = cask as T & { variations?: unknown; language_variations?: unknown };
  delete leaked.variations;
  delete leaked.language_variations;
  return cask;
}

const DRY_RUN_HEADER = /^Would (link|remove):$/;

/**
 * The absolute paths listed under a `Would link:` / `Would remove:` header.
 *
 * Anything else is ignored, including a path printed before any header: only
 * lines brew emitted as part of the plan count, so a future wording change
 * yields an empty list (read as "nothing to do") rather than a wrong one.
 */
export function parseCaskLinkDryRun(stdout: string): string[] {
  const lines = stdout.split("\n").map((raw) => raw.trimEnd());
  const header = lines.findIndex((line) => DRY_RUN_HEADER.test(line));
  if (header === -1) return [];
  return lines.slice(header + 1).filter((line) => line.startsWith("/"));
}

/**
 * What `brew {link,unlink} --cask --dry-run` says would change.
 *
 * `warnings` carries brew's stderr `Warning:` lines — the skip-because-a-formula-
 * owns-this-target case prints there and nowhere else, and it is the only
 * explanation for a link that would do nothing. A non-zero exit (cask not
 * installed, `:conflict`, brew lock) propagates as `ExecError`.
 */
export async function brewCaskLinkPreview(
  cask: Cask,
  action: CaskLinkVerb,
  cancel?: AbortSignal,
): Promise<{ paths: string[]; warnings: string[] }> {
  const { stdout, stderr } = await execBrew(`${action} --cask --dry-run ${brewIdentifier(cask)}`, { signal: cancel });
  return {
    paths: parseCaskLinkDryRun(stdout),
    warnings: stderr
      .split("\n")
      .map((line) => line.trimEnd())
      .filter((line) => line.startsWith("Warning:")),
  };
}
