export type SnapshotTab = { title: string; url: string };

/** The tabs of each Safari window. `windowRef` is Safari's window ID; `windowId` is the window's position. */
export type TabSnapshot = { windowRef: number; windowId: number; tabs: SnapshotTab[] }[];

export type NewTab = { windowRef: number; windowId: number; index: number } & SnapshotTab;

/**
 * Finds the tab that appeared between two snapshots: a window with exactly one more tab whose other tabs are
 * unchanged and in the same order, or a new window with a single tab. Returns undefined when there is no such tab or
 * more than one candidate, so an existing tab is never mistaken for the new one.
 */
export function findNewTab(before: TabSnapshot, after: TabSnapshot): NewTab | undefined {
  const candidates: NewTab[] = [];

  for (const win of after) {
    const previous = before.find((w) => w.windowRef === win.windowRef);
    if (!previous) {
      if (win.tabs.length === 1)
        candidates.push({ windowRef: win.windowRef, windowId: win.windowId, index: 1, ...win.tabs[0] });
      continue;
    }
    if (win.tabs.length !== previous.tabs.length + 1) continue;

    const inserted = insertedPositions(previous.tabs, win.tabs);
    // Several positions mean the new tab has the same URL as a neighbour, so it can't be told apart from it
    if (inserted.length === 1) {
      const index = inserted[0];
      candidates.push({ windowRef: win.windowRef, windowId: win.windowId, index: index + 1, ...win.tabs[index] });
    }
  }

  return candidates.length === 1 ? candidates[0] : undefined;
}

// Positions where removing one tab from `after` gives back `before`, compared by URL
function insertedPositions(before: SnapshotTab[], after: SnapshotTab[]): number[] {
  const positions: number[] = [];
  for (let i = 0; i < after.length; i++) {
    const rest = [...after.slice(0, i), ...after.slice(i + 1)];
    if (rest.every((tab, j) => tab.url === before[j].url)) positions.push(i);
  }
  return positions;
}

export type OpenCheck = { verified: true; tab: NewTab } | { verified: false; reason: string; tab?: NewTab };

/**
 * Decides whether opening `url` is verified: exactly one new tab appeared and it shows the requested site.
 * Without a snapshot from before opening, an existing tab could be mistaken for the new one, so it is never verified.
 */
export function checkOpenedTab(before: TabSnapshot | undefined, after: TabSnapshot | undefined, url: URL): OpenCheck {
  if (!before) return { verified: false, reason: "Safari's tabs could not be read before opening the page." };
  if (!after) return { verified: false, reason: "Safari's tabs could not be read after opening the page." };
  const tab = findNewTab(before, after);
  if (!tab) return { verified: false, reason: "No new tab could be identified." };
  if (!sameSite(tab.url, url)) return { verified: false, reason: "The new tab shows another site.", tab };
  return { verified: true, tab };
}

function sameSite(tabUrl: string, url: URL) {
  try {
    const host = (hostname: string) => hostname.replace(/^www\./, "");
    return host(new URL(tabUrl).hostname) === host(url.hostname);
  } catch {
    return false;
  }
}
