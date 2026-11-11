// Thread links landed before stable 0.1.0, in this nightly. Unknown versions use
// the legacy command palette path rather than assuming the desktop understands them.
const FIRST_NIGHTLY_DATE = 20261012;
const FIRST_NIGHTLY_BUILD = 3010;
const VERSION =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-nightly\.(\d{8})\.(0|[1-9]\d*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

function supportsThreadLinks(version: string | undefined): boolean {
  const match = version && VERSION.exec(version);
  if (!match) return false;
  const [major, minor, patch] = match.slice(1, 4).map(Number);
  if (![major, minor, patch].every(Number.isSafeInteger)) return false;
  const [, , , , date, build] = match;
  if (date === undefined) return major > 0 || minor > 0;
  if (!Number.isSafeInteger(Number(build))) return false;
  // Earlier nightly version numbers predate thread links, even if their suffix
  // happens to resemble a later date.
  if (major === 0 && minor === 0 && patch < 46) return false;
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(4, 6));
  const day = Number(date.slice(6, 8));
  const parsedDate = new Date(Date.UTC(year, month - 1, day));
  if (
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day
  ) {
    return false;
  }
  return (
    Number(date) > FIRST_NIGHTLY_DATE ||
    (Number(date) === FIRST_NIGHTLY_DATE &&
      Number(build) >= FIRST_NIGHTLY_BUILD)
  );
}

/** A desktop thread link, or null when the legacy opening path is needed. */
export function threadDeepLink(
  environmentId: string | undefined,
  threadId: string,
  desktopVersion: string | undefined,
): string | null {
  if (
    !environmentId?.trim() ||
    !threadId.trim() ||
    !supportsThreadLinks(desktopVersion)
  ) {
    return null;
  }
  // URL parsers normalize dot-only segments instead of treating them as IDs.
  if ([environmentId, threadId].some((id) => id === "." || id === "..")) {
    return null;
  }
  return `t3code://threads/${encodeURIComponent(environmentId)}/${encodeURIComponent(threadId)}`;
}
