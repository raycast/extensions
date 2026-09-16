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
 * `undefined` — not `false` — when the record carries no `artifacts` at all
 * (an older chunk cache): unknown means offer the actions and let the dry-run
 * answer, rather than hiding a working action on missing evidence.
 */
export function caskHasSymlinkArtifacts(cask: Pick<Cask, "artifacts">): boolean | undefined {
  if (!cask.artifacts) return undefined;
  return cask.artifacts.some((artifact) =>
    CASK_SYMLINK_STANZAS.some((stanza) => Object.prototype.hasOwnProperty.call(artifact, stanza)),
  );
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
