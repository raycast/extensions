import { List, Icon, Color } from "@raycast/api";
import { ExtensionData, DisplayTab } from "../types";
import { getTabGroupColor, RESOLVED_ICONS, RESOLVED_COLORS } from "../helpers";
import { globalCustomTitles, globalTabPool } from "../context/BrowserStore";

// V304: Fast Hostname Extractor (Sub-millisecond)
// Replaces heavy 'new URL()' constructor which is expensive in large loops.
export function getHostnameFast(url: string | undefined): string {
  if (!url || !url.includes("://")) return "";
  try {
    const start = url.indexOf("://") + 3;
    let end = url.indexOf("/", start);
    if (end === -1) end = url.length;
    let hostname = url.substring(start, end);

    // Remove port if present
    const portIndex = hostname.indexOf(":");
    if (portIndex !== -1) hostname = hostname.substring(0, portIndex);

    // Remove www.
    if (hostname.startsWith("www.")) return hostname.substring(4);
    return hostname;
  } catch {
    return "";
  }
}

// V311: Fast Title Cleanup (strips search/site suffixes)
export function cleanTitle(title: string): string {
  if (!title) return "";
  // Removes " - Google Search", " - Google Maps", " | YouTube", etc.
  return title
    .replace(/\s+-\s+Google\s+Search$/i, "")
    .replace(/\s+-\s+Google\s+Maps$/i, "")
    .replace(/\s+[-|]\s+YouTube$/i, "")
    .replace(/\s+[-|]\s+Microsoft\s+Teams$/i, "")
    .replace(/\s+[-|]\s+Gmail$/i, "")
    .replace(/\s+[-|]\s+Outlook$/i, "")
    .replace(/\s+[-|]\s+Spotify$/i, "")
    .trim();
}

// V1605: Enrichment Engine (Moves all UI logic to the background)
function enrichTab(
  tab: DisplayTab,
  extensionData: ExtensionData | null,
  idx = 0,
): void {
  const bType = tab.browserType || "browser";

  // 1. Pre-compute Display Subtitle (Clean URL)
  tab.displaySubtitle = getHostnameFast(tab.url);

  // Reader Mode: fix lost favicon + mark as reader tab
  const isReaderMode = tab.url?.startsWith("read:") ?? false;

  // 2. Pre-compute Virtual Accessories (Icons)
  const acc: List.Item.Accessory[] = [];

  // A. Window/State Metadata
  if (tab.windowType === "popup") {
    const isFirst = idx === 0;
    acc.push({
      icon: {
        source: Icon.Desktop,
        tintColor: isFirst ? Color.Blue : Color.SecondaryText,
      },
      tooltip: "Popup Tab",
    });
  }
  if (tab.windowState === "fullscreen" && tab.isActive) {
    acc.push({
      icon: { source: Icon.Maximize, tintColor: Color.Blue },
      tooltip: "Fullscreen",
    });
  }

  // B. Media & Audio
  if (tab.audible)
    acc.push({ icon: Icon.SpeakerHigh, tooltip: "Playing Audio" });

  // D. Status Indicators
  if (tab.pinned) {
    acc.push({
      icon: {
        source: RESOLVED_ICONS.pinned,
        tintColor: RESOLVED_COLORS.pinned,
      },
      tooltip: "Pinned Tab",
    });
  }

  if (tab.discarded) {
    acc.push({
      icon: {
        source: RESOLVED_ICONS.discarded,
        tintColor: RESOLVED_COLORS.discarded,
      },
      tooltip: "Discarded (Memory Released)",
    });
  }
  if (tab.frozen && !tab.discarded) {
    acc.push({
      icon: {
        source: RESOLVED_ICONS.sleeping,
        tintColor: RESOLVED_COLORS.sleeping,
      },
      tooltip: "Sleeping",
    });
  }

  // E. Reader Mode
  if (isReaderMode) {
    acc.push({
      icon: { source: Icon.Mobile, tintColor: Color.Orange },
      tooltip: "Reader Mode",
    });
  }

  // F. Identity Indicators
  if (tab.isActive && tab.windowType !== "popup") {
    acc.push({
      icon: { source: Icon.Dot, tintColor: Color.Blue },
      tooltip: "Active Tab",
    });
  }

  // G. Group Tags
  const matchedGroup =
    tab.groupId && tab.groupId !== -1
      ? extensionData?.groups[tab.groupId]
      : null;
  if (matchedGroup) {
    acc.push({
      tag: {
        value: matchedGroup.title || "Group",
        color: getTabGroupColor(matchedGroup.color, bType),
      },
      tooltip: "Tab Group",
    });
  }

  tab.cachedAccessories = acc;
}

export function mergeTabs(
  extensionData: ExtensionData | null,
  limit?: number,
  skipPrune = false,
): DisplayTab[] {
  const extTabs = extensionData?.tabs || [];

  // V1400: GLOBAL GARBAGE COLLECTION
  const seenIds = new Set<string>();

  // V500: PRE-SORT RAW TABS
  // Active non-popup tab beats inactive non-popup tabs.
  // But popup tabs compete on pure recency — if a popup was used more recently
  // than the active normal tab, it wins.
  const sortedRaw = [...extTabs].sort((a, b) => {
    const aIsPopup = a.windowType === "popup";
    const bIsPopup = b.windowType === "popup";
    const aActive = a.active && !aIsPopup;
    const bActive = b.active && !bIsPopup;

    // Both normal tabs: active wins, then recency
    if (!aIsPopup && !bIsPopup) {
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      return (b.lastAccessed || 0) - (a.lastAccessed || 0);
    }

    // Mixed: popup vs normal — pure recency decides
    return (b.lastAccessed || 0) - (a.lastAccessed || 0);
  });

  const titleFreq: Record<string, number> = {};
  extTabs.forEach((et) => {
    const bType = et.browserType || "browser";
    const windowId = et.windowId || "unknown";
    const key = `${bType}-${windowId}-${et.title}`;
    titleFreq[key] = (titleFreq[key] || 0) + 1;
  });
  const titleCounter: Record<string, number> = {};

  const processingList = limit ? sortedRaw.slice(0, limit) : sortedRaw;

  const merged = processingList.map((et, idx) => {
    const bType = et.browserType || "browser";
    const windowId = et.windowId || "unknown";
    const titleKey = `${bType}-${windowId}-${et.title}`;

    const isDuplicate = titleFreq[titleKey] > 1;
    const customEntry = globalCustomTitles[String(et.id)];
    let activeCustomTitle: string | undefined;
    if (customEntry) {
      if (typeof customEntry !== "string" && customEntry.url) {
        const customHost = getHostnameFast(customEntry.url);
        const tabHost = getHostnameFast(et.url || "");
        if (!customHost || !tabHost || customHost === tabHost) {
          activeCustomTitle = customEntry.title;
        } else {
          delete globalCustomTitles[String(et.id)];
        }
      }
    }
    const baseTitle = activeCustomTitle || et.title;
    let displayTitle = cleanTitle(baseTitle);
    if (isDuplicate && !activeCustomTitle) {
      const count = (titleCounter[titleKey] || 0) + 1;
      titleCounter[titleKey] = count;
      displayTitle = `${et.title} (${count})`;
    }

    let displayUrl = et.url || "";
    if (bType === "helium" && displayUrl.startsWith("chrome://")) {
      displayUrl = displayUrl.replace("chrome://", "helium://");
    }

    const tid = String(et.id);
    seenIds.add(tid);

    const existing = globalTabPool.get(tid);

    // 1. Build the "Next" state for comparison
    const nextObj = {
      id: tid,
      extId: et.id,
      title: activeCustomTitle || et.title,
      displayTitle,
      url: displayUrl,
      subtitle: getHostnameFast(displayUrl),
      accessories: [],
      groupId: et.groupId,
      discarded: et.discarded,
      frozen: et.frozen,
      isActive: et.active,
      audible: et.audible,
      currentTime: et.currentTime,
      duration: et.duration,
      paused: et.paused,
      playbackRate: et.playbackRate,
      lastAccessed: et.lastAccessed,
      browserIndex: idx,
      pinned: !!et.pinned,
      favIconUrl: et.favIconUrl,
      windowId: et.windowId,
      browserType: bType,
      windowType: et.windowType,
      windowFocused: et.windowFocused,
      windowState: et.windowState,
      workspaceName: et.workspaceName,
      searchTitle: displayTitle.toLowerCase(),
      searchUrl: displayUrl.toLowerCase(),
    } as DisplayTab;

    // Reader Mode: derive favicon from original URL before pool comparison
    if (nextObj.url?.startsWith("read:")) {
      let domain = "";
      // Fast path: extract ?url= param without new URL() constructor
      const urlParamIdx = nextObj.url.indexOf("?url=");
      if (urlParamIdx !== -1) {
        try {
          domain = getHostnameFast(
            decodeURIComponent(nextObj.url.slice(urlParamIdx + 5)),
          );
        } catch {
          /* ignore */
        }
      }
      // Fallback: strip read: prefix and extract domain directly
      if (!domain)
        domain = getHostnameFast(nextObj.url.replace(/^read:[/]*/, ""));
      if (domain)
        nextObj.favIconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    }

    // V1605: Apply the Enrichment Engine (Sets displaySubtitle and cachedAccessories)
    enrichTab(nextObj, extensionData, idx);

    if (existing) {
      // V1605: Visual-Aware Identity Lock
      // We check every field that could possibly affect the UI presentation.
      // If none have changed meaningfully, we REUSE the existing object reference.
      const isIdentical =
        existing.title === nextObj.title &&
        existing.url === nextObj.url &&
        existing.favIconUrl === nextObj.favIconUrl &&
        existing.isActive === nextObj.isActive &&
        existing.pinned === nextObj.pinned &&
        existing.audible === nextObj.audible &&
        existing.discarded === nextObj.discarded &&
        existing.frozen === nextObj.frozen &&
        existing.windowType === nextObj.windowType &&
        existing.windowState === nextObj.windowState &&
        existing.workspaceName === nextObj.workspaceName &&
        existing.displaySubtitle === nextObj.displaySubtitle &&
        existing.paused === nextObj.paused &&
        existing.groupId === nextObj.groupId &&
        // For popup tabs, track whether they moved in/out of position 0 (blue vs magenta)
        (nextObj.windowType !== "popup" ||
          (existing.browserIndex === 0) === (nextObj.browserIndex === 0)) &&
        Math.floor(existing.currentTime || 0) ===
          Math.floor(nextObj.currentTime || 0) &&
        existing.playbackRate === nextObj.playbackRate;

      if (isIdentical) {
        // Silently update non-visual properties
        existing.currentTime = nextObj.currentTime;
        existing.duration = nextObj.duration;
        existing.lastAccessed = nextObj.lastAccessed;
        existing.browserIndex = nextObj.browserIndex;
        existing.windowFocused = nextObj.windowFocused;
        return existing;
      }
    }

    globalTabPool.set(tid, nextObj);
    return nextObj;
  });

  if (!skipPrune && (seenIds.size > 0 || extTabs.length === 0)) {
    for (const key of globalTabPool.keys()) {
      if (!seenIds.has(String(key))) {
        globalTabPool.delete(key);
      }
    }
  }

  return merged;
}
