/**
 * Version comparison for Homebrew packages.
 *
 * Import-free on purpose so it can be exercised directly by the checks — the
 * rest of the version logic lives in helpers.ts, which reaches @raycast/api
 * transitively and cannot be run outside Raycast.
 */

/** Homebrew appends `_N` to an installed FORMULA rebuilt at the same version. */
const REVISION_SUFFIX = /_\d+$/;

/** Plain dotted numbers — the only shape this module claims to understand. */
const NUMERIC_VERSION = /^\d+(?:\.\d+)*$/;

/** Strip a formula's rebuild revision. `stable` never carries one. */
export function stripRevision(version: string): string {
  return version.replace(REVISION_SUFFIX, "");
}

/**
 * Order two version strings: negative if `a` is older, 0 if equal, positive if
 * `a` is newer. **Undefined when they are not comparable**, which the caller
 * must treat as "don't know", never as "different, therefore outdated".
 *
 * Only plain dotted-numeric versions are compared. Everything else — a
 * prerelease (`1.0b2`, `1.0-rc1`), a patch level (`1.0-p1`), a date, `latest`,
 * `HEAD` — returns undefined.
 *
 * That refusal is the point. An earlier version of this tried to rank those
 * shapes by splitting into digit and letter runs, and got them wrong in ways
 * that are hard to see and easy to ship: it ranked `1.0b2` above `1.0` because
 * the beta had more segments, ordered `1.0-p1` below `1.0-rc1` because "p"
 * sorts before "rc", and mis-ranked case variants. Homebrew implements real
 * version semantics in Ruby; this module does not, so it declines the cases it
 * cannot do correctly and leaves them to brew's own `outdated` flag.
 */
export function compareVersions(a: string, b: string): number | undefined {
  if (a === b) {
    return 0;
  }
  if (!NUMERIC_VERSION.test(a) || !NUMERIC_VERSION.test(b)) {
    return undefined;
  }

  const left = a.split(".").map(Number);
  const right = b.split(".").map(Number);

  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    // A missing component is zero, so 5 and 5.0 and 5.0.0 are all equal.
    const x = left[i] ?? 0;
    const y = right[i] ?? 0;
    if (x !== y) {
      return x < y ? -1 : 1;
    }
  }

  return 0;
}

/**
 * Is `installed` OLDER than `stable`?
 *
 * False whenever that cannot be established — including when the installed
 * version is NEWER, and when the two are not comparable. Offering an upgrade
 * that does not exist is worse than missing one: it would fail or downgrade.
 */
export function isOutdatedVersion(
  installed: string | undefined,
  stable: string | undefined,
  { stripRevision: strip = false }: { stripRevision?: boolean } = {},
): boolean {
  if (!installed || !stable) {
    return false;
  }
  return compareVersions(strip ? stripRevision(installed) : installed, stable) === -1;
}
