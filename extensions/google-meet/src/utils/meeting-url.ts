const MEET_HOSTNAME = "meet.google.com";

// Generated meeting codes are three lowercase letter/number groups, e.g.
// "pen-adzt-swz". This intentionally excludes "/new" (the creation page),
// "/_meet/..." and other Meet routes that aren't a shareable meeting link.
const MEETING_CODE_PATH = /^\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/i;

/**
 * Validates a candidate string as a real, shareable Google Meet URL and
 * returns its canonical form (https, no query string). Returns `undefined`
 * for anything else — including "/new", non-Meet hosts, and malformed input
 * — so callers never have to special-case rejection reasons.
 */
export function normalizeMeetingUrl(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return undefined;
  }

  if (url.protocol !== "https:") {
    return undefined;
  }

  if (url.hostname.toLowerCase() !== MEET_HOSTNAME) {
    return undefined;
  }

  if (!MEETING_CODE_PATH.test(url.pathname)) {
    return undefined;
  }

  return `https://${MEET_HOSTNAME}${url.pathname.toLowerCase()}`;
}

/**
 * Picks the first valid meeting URL out of a list of candidates gathered
 * from (potentially several) browser windows/tabs. Callers should order
 * `candidates` with the most likely match first (e.g. frontmost window
 * before background windows) since this returns on the first match rather
 * than trying to rank them itself.
 */
export function selectMeetingUrl(candidates: string[]): string | undefined {
  for (const candidate of candidates) {
    const normalized = normalizeMeetingUrl(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return undefined;
}
