import type { WaybackCdxServerSnapshot } from "./lib";

export function buildUrls(snapshot: WaybackCdxServerSnapshot) {
  // snapshotUrl points to a specific archived capture.
  // calendarUrl opens the Wayback calendar view for pages with multiple captures.

  const { original, timestamp } = snapshot;

  let displayUrl = "";
  try {
    displayUrl = decodeURI(original);
  } catch {
    displayUrl = original;
  }

  const encodedOriginal = encodeURIComponent(original);

  // timestamp === endtimestamp, means there is only one snapshot
  const snapshotUrl = `/web/${timestamp}/${encodedOriginal}`;
  const calendarUrl = `/web/${timestamp}*/${encodedOriginal}`;

  return {
    displayUrl,
    snapshotUrl: `https://web.archive.org${snapshotUrl}`,
    calendarUrl: `https://web.archive.org${calendarUrl}`,
  };
}
