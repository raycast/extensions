/**
 * Version comparison for Homebrew packages.
 *
 * Import-free on purpose so it can be exercised directly by the checks — the
 * rest of the version logic lives in helpers.ts, which reaches @raycast/api
 * transitively and cannot be run outside Raycast.
 */

/** A version splits into runs of digits and runs of everything else. */
function segments(version: string): (string | number)[] {
  return (version.match(/\d+|[a-zA-Z]+/g) ?? []).map((part) => (/^\d+$/.test(part) ? Number(part) : part));
}

/**
 * Order two version strings: negative if `a` is older, 0 if equal, positive if
 * `a` is newer. **Undefined when they are not comparable** — the caller must
 * treat that as "don't know", never as "different, therefore outdated".
 *
 * Deliberately conservative rather than a full implementation of Homebrew's
 * Ruby `Version` class. Numeric runs compare numerically so 10 sorts after 9;
 * a shorter prefix is older (`1.2` before `1.2.1`); and anything mixing a
 * number against a word at the same position (`3` vs `latest`) is incomparable.
 */
export function compareVersions(a: string, b: string): number | undefined {
  if (a === b) {
    return 0;
  }

  const left = segments(a);
  const right = segments(b);

  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const x = left[i];
    const y = right[i];

    // One ran out: the shorter is older, but only if it was a prefix so far.
    if (x === undefined) return -1;
    if (y === undefined) return 1;

    if (typeof x === "number" && typeof y === "number") {
      if (x !== y) return x < y ? -1 : 1;
    } else if (typeof x === "string" && typeof y === "string") {
      if (x !== y) return x < y ? -1 : 1;
    } else {
      // A number against a word — "latest", "beta", a date-like token. No
      // meaningful order, so refuse to guess.
      return undefined;
    }
  }

  return 0;
}

/**
 * Is `installed` OLDER than `stable`?
 *
 * Returns false whenever that cannot be established — including when the
 * installed version is NEWER (a HEAD build, or an index that lags), and when
 * the two are not comparable at all. Reporting an upgrade that does not exist
 * is worse than missing one: the upgrade would fail or downgrade.
 *
 * `stripRevision` is for formulae only. Homebrew appends `_N` to an installed
 * formula version when it is rebuilt without a version change (`1.23.1_1`) and
 * `versions.stable` never carries one, so a raw compare marks every rebuilt
 * formula as outdated forever. Cask versions may contain underscores as
 * ordinary syntax, so the suffix must NOT be stripped for them.
 */
export function isOutdatedVersion(
  installed: string | undefined,
  stable: string | undefined,
  { stripRevision = false }: { stripRevision?: boolean } = {},
): boolean {
  if (!installed || !stable) {
    return false;
  }

  const current = stripRevision ? installed.replace(/_\d+$/, "") : installed;
  return compareVersions(current, stable) === -1;
}
