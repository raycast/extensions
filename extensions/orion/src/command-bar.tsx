import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ActionPanel, Icon, List } from "@raycast/api";

import useTabs from "./hooks/useTabs";
import useBookmarks from "./hooks/useBookmarks";
import useReadingList from "./hooks/useReadingList";
import useHistorySearch from "./hooks/useHistorySearch";
import useSuggestions from "./hooks/useSuggestions";
import useProfiles, { useSelectedProfileId } from "./hooks/useProfiles";

import ProfileDropdown from "./components/ProfileDropdown";
import TabListItem from "./components/TabListItem";
import UrlListItem, { UrlItem } from "./components/UrlListItem";
import SuggestionListItem from "./components/SuggestionListItem";
import OpenInOrionAction from "./components/OpenInOrionAction";
import OpenInDefaultBrowserAction from "./components/OpenInDefaultBrowserAction";
import { searchTabsWithFallback } from "./tabSearch";

import { Bookmark, HistoryItem, Tab } from "./types";
import {
  buildSearchUrl,
  extractDomainName,
  getSearchEngineName,
  getTabKey,
  isLauncherTab,
  isWebAddress,
  normalizeWebAddress,
  splitSearchTerms,
} from "./utils";

const LIMITS = { tabs: 6, bookmarks: 6, reading: 4, history: 8 };
const TOP_HIT_ITEM_ID = "top-hit";
const OPEN_ADDRESS_ITEM_ID = "open-address";
const CURRENT_TAB_HANDOFF_SETTLE_MS = 50;
const CURRENT_TAB_HANDOFF_FALLBACK_MS = 150;
// Unlike CURRENT_TAB_HANDOFF_SETTLE_MS above, this one is not a wall-clock
// safety margin: the acknowledgement it fences is a same-tick side effect of
// the `setSelectedItemId` call just above it, so the very next event-loop
// turn is already past it. A larger, fixed delay here would instead risk
// swallowing a genuine fast Ctrl+N/Ctrl+P landing in the window right after
// the list expands to its full content.
const CURRENT_TAB_FINAL_ACK_TIMEOUT_MS = 0;

type SelectionSession = {
  key: string;
  target?: string;
  postHandoffTarget?: string;
  currentTabId?: string;
  currentTabHandoffConfirmed?: boolean;
  awaitingFinalTargetAcknowledgement?: boolean;
  // `selectedItemId` is needed only to establish Current Tab as the native
  // List's initial row. Leaving it set afterwards turns every first Ctrl+N/P
  // into a repeated controlled selection instead of native navigation.
  currentTabSelectionReleased?: boolean;
  currentTabSelectionReleaseScheduled?: boolean;
  awaitingTarget: boolean;
  userNavigated: boolean;
};

// Exact navigation intent has higher tiers than general text matching. These
// tiers deliberately dominate source preferences and frecency in Top Hit.
function scoreTerm(term: string, title: string, domain: string, url: string): number {
  if (domain === term || url === term) return 7;
  if (domain.startsWith(term)) return 6;
  if (title.startsWith(term)) return 5;
  if (title.includes(term) || domain.includes(term)) return 3;
  if (url.includes(term)) return 1;
  return 0;
}

function normalizedAddress(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "");
}

function relevance(query: string, title: string | undefined, url: string): number {
  const t = (title ?? "").toLowerCase();
  const d = extractDomainName(url).toLowerCase();
  const u = normalizedAddress(url);
  const addressQuery = normalizedAddress(query);

  const phraseScore = scoreTerm(addressQuery, t, d, u);
  if (phraseScore > 0) return phraseScore;

  const terms = splitSearchTerms(query);
  if (terms.length <= 1) return 0;

  const termScores = terms.map((term) => scoreTerm(term, t, d, u));
  if (termScores.some((score) => score === 0)) return 0;

  return Math.min(...termScores);
}

function textMatchesQuery(query: string, text: string): boolean {
  const haystack = text.toLowerCase();
  return splitSearchTerms(query).every((term) => haystack.includes(term));
}

type Hit =
  | { kind: "tab"; tab: Tab; key: string }
  | { kind: "url"; item: UrlItem; source: string; key: string; visitCount?: number; lastVisitTime?: string };

const tabKey = getTabKey;

function sourcePriority(hit: Hit): number {
  if (hit.kind === "tab") return 4;
  if (hit.source === "Bookmark") return 3;
  if (hit.source === "Reading List") return 2;
  return 1;
}

function historyFrecency(hit: Hit): number {
  if (hit.kind !== "url" || hit.source !== "History") return 0;

  const visitBoost = Math.min(0.45, Math.log2((hit.visitCount ?? 0) + 1) * 0.07);
  const lastVisited = hit.lastVisitTime ? new Date(hit.lastVisitTime).getTime() : 0;
  const ageDays = lastVisited > 0 ? Math.max(0, (Date.now() - lastVisited) / 86_400_000) : Number.POSITIVE_INFINITY;
  const recencyBoost = Number.isFinite(ageDays) ? 0.35 * Math.exp(-ageDays / 14) : 0;
  return visitBoost + recencyBoost;
}

type RankedHit = { hit: Hit; tier: number };

// Used only for deduplicating destinations across sources. Unlike
// `normalizedAddress` (a lenient match used for relevance scoring), this must
// not conflate distinct destinations: scheme (http vs https) and a trailing
// slash can each point to a genuinely different resource.
function canonicalUrl(url: string): string {
  const trimmed = url.trim();
  // The host is case-insensitive (https://Example.com and https://example.com
  // are the same destination), but the rest of the URL - scheme, path, query,
  // fragment - is left exactly as-is: those can be genuinely different
  // resources (see the comment above `canonicalUrl`'s only caller group).
  try {
    const parsed = new URL(trimmed);
    parsed.hostname = parsed.hostname.toLowerCase();
    return parsed.toString();
  } catch {
    return trimmed;
  }
}

function compareRankedHits(a: RankedHit, b: RankedHit): number {
  // Exactness always wins. Source priority only resolves candidates in the
  // same matching tier.
  if (a.tier !== b.tier) return b.tier - a.tier;

  const aSource = sourcePriority(a.hit);
  const bSource = sourcePriority(b.hit);
  if (aSource !== bSource) return bSource - aSource;

  // When identical open tabs tie for Top Hit, resuming the tab currently
  // visible in Orion is less surprising than choosing an arbitrary duplicate.
  if (a.hit.kind === "tab" && b.hit.kind === "tab" && a.hit.tab.is_current !== b.hit.tab.is_current) {
    return Number(b.hit.tab.is_current) - Number(a.hit.tab.is_current);
  }

  // Frecency is intentionally limited to History-vs-History comparisons. A
  // frequently visited page must not outrank an equally relevant open tab or
  // explicit bookmark.
  const aFrecency = historyFrecency(a.hit);
  const bFrecency = historyFrecency(b.hit);
  if (aFrecency !== bFrecency) return bFrecency - aFrecency;

  const aLastVisit = a.hit.kind === "url" ? (a.hit.lastVisitTime ?? "") : "";
  const bLastVisit = b.hit.kind === "url" ? (b.hit.lastVisitTime ?? "") : "";
  if (aLastVisit !== bLastVisit) {
    // Compare the parsed instants, not the raw strings: this stays correct
    // (and never throws) regardless of the exact timestamp format the data
    // source hands back, unlike a string `.localeCompare()` that depends on
    // both sides actually being strings in a lexicographically sortable shape.
    const aTime = Date.parse(aLastVisit);
    const bTime = Date.parse(bLastVisit);
    if (!Number.isNaN(aTime) && !Number.isNaN(bTime)) return bTime - aTime;
    return bLastVisit.localeCompare(aLastVisit);
  }
  return a.hit.key.localeCompare(b.hit.key);
}

function deduplicateRankedHits(candidates: RankedHit[]): RankedHit[] {
  const grouped = new Map<string, RankedHit[]>();
  candidates.forEach((candidate) => {
    const url = candidate.hit.kind === "tab" ? candidate.hit.tab.url : candidate.hit.item.url;
    const key = canonicalUrl(url);
    const existing = grouped.get(key) ?? [];
    existing.push(candidate);
    grouped.set(key, existing);
  });

  return Array.from(grouped.values()).map((group) => {
    // A duplicate URL represents the same destination. Keep its strongest
    // match tier, but choose the interaction source by intent: resume an open
    // tab before opening an explicit bookmark, reading-list item, or history.
    const tier = Math.max(...group.map((candidate) => candidate.tier));
    const representative = [...group].sort((a, b) => {
      const sourceDifference = sourcePriority(b.hit) - sourcePriority(a.hit);
      return sourceDifference || compareRankedHits(a, b);
    })[0];
    return { ...representative, tier };
  });
}

// Applies `limit` while building the result, not after: registering a URL
// that the limit ends up hiding would let that invisible candidate suppress
// a matching, otherwise-visible result in a later section.
function uniqueUrls<T extends { url: string }>(items: T[], seen: Set<string>, limit: number): T[] {
  const result: T[] = [];
  for (const item of items) {
    if (result.length >= limit) break;
    const key = canonicalUrl(item.url);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

export default function Command() {
  const [query, setQuery] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string>();
  const [, setHandoffVersion] = useState(0);
  const selectionSessionRef = useRef<SelectionSession | undefined>(undefined);
  // This records an acknowledged native selection, not merely the item we
  // asked Raycast to select. Those two values can temporarily differ while
  // asynchronous local results reorder the list.
  const nativeSelectionRef = useRef<string | null>(null);
  // Holds the last Top Hit confirmed while History was current, plus the
  // profile it was confirmed under, so it can be reused below across the
  // brief window where the History query hasn't caught up with the latest
  // keystroke yet - but only while it still plausibly belongs to what is
  // currently typed (see the relevance check at the reuse site below), not
  // whenever the user has since typed something unrelated or switched
  // profiles.
  const lastConfirmedHistoryTopHitRef = useRef<{ profileId: string; hit: Hit } | undefined>(undefined);
  const q = query.trim().toLowerCase();
  const hasQuery = q.length > 0;

  const { profiles } = useProfiles();
  const { selectedProfileId, setSelectedProfileId } = useSelectedProfileId("Defaults");

  // Open Tabs can change while the Command Bar is visible. Keep this command
  // current without affecting the standalone Search Tabs command.
  const { tabs, refresh, markTabActive } = useTabs({ refreshWhileOpen: true });
  const { bookmarks, isLoading: bookmarksLoading } = useBookmarks(selectedProfileId);
  const { readingList } = useReadingList(selectedProfileId);
  const {
    data: history,
    permissionView,
    completedQueryKey,
  } = useHistorySearch(selectedProfileId, hasQuery ? query : undefined);
  const { suggestions } = useSuggestions(query);
  const historyQueryKey = `${selectedProfileId}\u0000${hasQuery ? query : ""}`;
  const hasCurrentHistoryResult = !hasQuery || completedQueryKey === historyQueryKey;

  // A result ID from the previous query can disappear while typing (for
  // example, the "Open Address" item vanishes when `sina.com.cn` becomes
  // `sina`). Reset the session synchronously with the input change so
  // Raycast's fallback selection cannot be mistaken for manual navigation.
  const resetSelectionSession = (profileId: string, nextQuery: string) => {
    selectionSessionRef.current = {
      key: `${profileId}\u0000${nextQuery}`,
      target: undefined,
      awaitingTarget: false,
      userNavigated: false,
    };
    setSelectedItemId(undefined);
  };

  // Loading local history and remote suggestions for each keystroke should not
  // put the entire List into a loading state. Keep the existing results stable
  // while those incremental refreshes happen in the background.
  const isLoading = !profiles || tabs === undefined || bookmarksLoading;

  // Never show the launcher tabs in the list itself.
  const openTabs: Tab[] = (tabs ?? []).filter((t) => !isLauncherTab(t.url));

  // Filter each source against the query (open tabs are always shown when empty).
  const tabHits: Tab[] = openTabs.filter((t) => !hasQuery || relevance(q, t.title, t.url) > 0);
  const bookmarkHits: Bookmark[] = hasQuery
    ? bookmarks.filter((b) => relevance(q, b.title, b.url) > 0 || b.folders.some((f) => textMatchesQuery(q, f)))
    : [];
  const readingHits: Bookmark[] = hasQuery ? (readingList ?? []).filter((b) => relevance(q, b.title, b.url) > 0) : [];
  const displayedHistoryHits: HistoryItem[] = hasQuery
    ? (history ?? []).filter((h) => relevance(q, h.title, h.url) > 0)
    : [];
  // useSQL keeps its previous data while the new statement executes. Do not
  // allow that previous result set to influence Top Hit, but keep it visible
  // when it still matches the new text to avoid needless list reflow.
  const historyHits: HistoryItem[] = hasCurrentHistoryResult ? displayedHistoryHits : [];
  const suggestionHits: string[] = hasQuery ? suggestions : [];

  // Pick the single best exact local match as Top Hit. Fuzzy/pinyin tab
  // matches are rendered only as ordinary fallback candidates below.
  let topHit: Hit | undefined;
  if (hasQuery) {
    const candidates: RankedHit[] = [];
    tabHits.forEach((t) =>
      candidates.push({ hit: { kind: "tab", tab: t, key: tabKey(t) }, tier: relevance(q, t.title, t.url) }),
    );
    bookmarkHits.forEach((b) =>
      candidates.push({
        hit: { kind: "url", item: b, source: "Bookmark", key: `bm-${b.uuid}` },
        tier: relevance(q, b.title, b.url),
      }),
    );
    readingHits.forEach((b) =>
      candidates.push({
        hit: { kind: "url", item: b, source: "Reading List", key: `rl-${b.uuid}` },
        tier: relevance(q, b.title, b.url),
      }),
    );
    historyHits.forEach((h) =>
      candidates.push({
        hit: {
          kind: "url",
          item: h,
          source: "History",
          key: `hist-${h.id}`,
          visitCount: h.visitCount,
          lastVisitTime: h.lastVisitTime,
        },
        tier: relevance(q, h.title, h.url),
      }),
    );
    topHit = deduplicateRankedHits(candidates).sort(compareRankedHits)[0]?.hit;
  }

  // `historyHits` is excluded above while the History query hasn't caught up
  // with the latest keystroke yet (see useHistorySearch's staleness guard),
  // so recomputing Top Hit during that gap can hand it to a lower-priority
  // Tab or Bookmark match - or to nothing - only for History to reclaim it a
  // few milliseconds later once the fresh result lands. Reuse the previous
  // History-backed Top Hit across that gap instead of letting it flicker to
  // a different candidate and back - but only while it is still plausibly
  // what the user is typing towards: the same profile, and still relevant to
  // the text typed so far. Otherwise (a profile switch, or text unrelated to
  // it) it must not be shown, or Enter could open a stale destination the
  // user never intended. A genuinely different result, once History is
  // current again, still replaces it normally.
  if (hasCurrentHistoryResult) {
    lastConfirmedHistoryTopHitRef.current =
      topHit?.kind === "url" && topHit.source === "History" ? { profileId: selectedProfileId, hit: topHit } : undefined;
  } else {
    const frozen = lastConfirmedHistoryTopHitRef.current;
    const stillRelevant =
      frozen &&
      frozen.profileId === selectedProfileId &&
      frozen.hit.kind === "url" &&
      relevance(q, frozen.hit.item.title, frozen.hit.item.url) > 0;
    if (stillRelevant) {
      topHit = frozen.hit;
    }
  }

  // Drop the top hit from its own section to avoid showing it twice.
  const topTabKey = topHit?.kind === "tab" ? topHit.key : undefined;
  const topUrlKey = topHit?.kind === "url" ? topHit.key : undefined;

  const topUrl = topHit?.kind === "tab" ? topHit.tab.url : topHit?.item.url;
  // Tabs are instances, not merely destinations. Keep duplicate URLs in Open
  // Tabs, while retaining canonical-URL de-duplication only across sources.
  // A Tab Top Hit removes only its own instance; the other instances remain.
  const seenUrls = new Set(topHit?.kind === "url" && topUrl ? [canonicalUrl(topUrl)] : []);
  const exactTabSection = tabHits
    .filter((t) => tabKey(t) !== topTabKey && !seenUrls.has(canonicalUrl(t.url)))
    .slice(0, hasQuery ? LIMITS.tabs : tabHits.length);
  if (topHit?.kind === "tab") seenUrls.add(canonicalUrl(topHit.tab.url));
  exactTabSection.forEach((tab) => seenUrls.add(canonicalUrl(tab.url)));
  const fuzzyTabSection =
    hasQuery && tabHits.length === 0
      ? searchTabsWithFallback(openTabs, query, LIMITS.tabs).filter((tab) => !seenUrls.has(canonicalUrl(tab.url)))
      : [];
  fuzzyTabSection.forEach((tab) => seenUrls.add(canonicalUrl(tab.url)));
  const tabSection = exactTabSection.length > 0 ? exactTabSection : fuzzyTabSection;
  const bookmarkSection = uniqueUrls(
    bookmarkHits.filter((b) => `bm-${b.uuid}` !== topUrlKey),
    seenUrls,
    LIMITS.bookmarks,
  );
  const readingSection = uniqueUrls(
    readingHits.filter((b) => `rl-${b.uuid}` !== topUrlKey),
    seenUrls,
    LIMITS.reading,
  );
  const historySection = uniqueUrls(
    displayedHistoryHits.filter((h) => `hist-${h.id}` !== topUrlKey),
    seenUrls,
    LIMITS.history,
  );
  const address = isWebAddress(query) ? normalizeWebAddress(query) : undefined;

  // Identify Top Hit by its destination, not by query text: a candidate that
  // keeps winning across keystrokes must keep the same ID so it does not
  // re-trigger the single-row isolation handoff below on every keystroke -
  // only a destination that actually changes (or reappears after being
  // absent) needs that handoff. `topHit.key` alone is also used as the row ID
  // for its underlying source section (e.g. Bookmarks/History); the
  // `TOP_HIT_ITEM_ID` prefix keeps this ID distinct from that, even though
  // the matching row is always filtered out of its own section below.
  const topHitItemId = topHit ? `${TOP_HIT_ITEM_ID}\u0000${topHit.key}` : undefined;
  const openAddressItemId = address ? `${OPEN_ADDRESS_ITEM_ID}\u0000${address}` : undefined;
  // An empty query has no Top Hit or address to focus. Land it on whichever
  // open tab is currently visible in Orion instead of leaving selection to an
  // arbitrary native default.
  //
  // `currentTabItemId` identifies the tab instance (window + index) only,
  // deliberately excluding its URL. Re-anchoring on Current Tab further below
  // only needs to run when the instance itself changes, not on every URL
  // update within that same tab - navigating the current tab, or a newly
  // opened tab whose URL is still settling through redirects, otherwise
  // re-triggers the single-row isolate/settle/expand handoff for no reason,
  // producing extra, visible focus moves.
  const currentTab = !hasQuery ? openTabs.find((tab) => tab.is_current) : undefined;
  const currentTabKey = currentTab ? tabKey(currentTab) : undefined;
  const currentTabItemId = currentTabKey;
  const currentTabHandoffItemId = currentTabItemId ? `${currentTabItemId}\u0000current-tab-handoff` : undefined;
  const automaticTarget = topHitItemId ?? openAddressItemId ?? currentTabItemId;
  const selectionSession = selectionSessionRef.current;
  // The first Open Tabs snapshot often arrives after Raycast has already
  // mounted a native List with row one selected. Supply the active Orion tab
  // as that List's initial controlled selection instead of trying to override
  // row one later. `userNavigated` immediately disables this fallback, so
  // Ctrl+N/P remains entirely native after the user's first move.
  const currentTabInitialSelection =
    !hasQuery && currentTabItemId && !selectionSession?.userNavigated && !selectionSession?.currentTabSelectionReleased
      ? currentTabItemId
      : undefined;
  const listSelectedItemId = selectedItemId ?? currentTabInitialSelection;
  // A different current tab is an external browser-context change. Giving
  // this empty-query List a fresh React key makes its initial selected ID and
  // viewport apply together, including when the active tab is below the fold.
  const listKey = `${selectedProfileId}\u0000${hasQuery ? query : (currentTabItemId ?? "current-tab-pending")}\u0000${
    hasQuery ? "query" : "current"
  }`;

  // Keep Current Tab controlled exactly long enough for a newly mounted List
  // to paint the correct initial row and scroll it into view. Releasing on
  // the next turn preserves that first frame, while every subsequent Ctrl+N/P
  // is handled by Raycast's own List (including its normal scrolling).
  const releaseCurrentTabToNativeList = (session: SelectionSession, target: string, delay = 0) => {
    if (session.currentTabSelectionReleased || session.currentTabSelectionReleaseScheduled) return;

    const sessionKey = session.key;
    session.currentTabSelectionReleaseScheduled = true;
    setTimeout(() => {
      const current = selectionSessionRef.current;
      if (
        !current ||
        current.key !== sessionKey ||
        current.target !== target ||
        current.userNavigated ||
        current.awaitingTarget ||
        current.postHandoffTarget ||
        current.awaitingFinalTargetAcknowledgement
      ) {
        return;
      }

      current.currentTabSelectionReleased = true;
      current.currentTabSelectionReleaseScheduled = false;
      nativeSelectionRef.current = target;
      setSelectedItemId(undefined);
      setHandoffVersion((version) => version + 1);
    }, delay);
  };

  // A query/profile session auto-selects its best destination only until the
  // user starts native navigation. `selectedItemId` alone is not sufficient
  // when a late History result replaces an already-selected Bookmark: Raycast
  // can retain the old native row even though the prop changed. During that
  // one handoff, render only the target item for one commit before returning
  // the remaining sections. We never enter this gate after Ctrl+N/P.
  useLayoutEffect(() => {
    const key = `${selectedProfileId}\u0000${query}`;
    const previous = selectionSessionRef.current;
    const isNewSession = previous?.key !== key;

    const beginAutomaticSelection = (
      session: SelectionSession,
      target: string | undefined,
      forceNativeHandoff = false,
    ) => {
      const isCurrentTabTarget = !hasQuery && target === currentTabItemId && !!currentTabHandoffItemId;
      const handoffTarget = isCurrentTabTarget ? currentTabHandoffItemId : target;
      session.target = handoffTarget;
      session.postHandoffTarget = isCurrentTabTarget ? target : undefined;
      session.currentTabHandoffConfirmed = false;
      session.awaitingFinalTargetAcknowledgement = false;
      if (isCurrentTabTarget) {
        session.currentTabSelectionReleased = false;
        session.currentTabSelectionReleaseScheduled = false;
      }

      if (!handoffTarget) {
        session.awaitingTarget = false;
        session.awaitingFinalTargetAcknowledgement = false;
        nativeSelectionRef.current = null;
        setSelectedItemId(undefined);
        return;
      }

      // A new query/profile is a new selection session even if it resolves to
      // the same item ID. Raycast can otherwise retain a row from the previous
      // layout (for example an Open Tab after `w` becomes `we`) and ignore the
      // repeated selectedItemId value. Force the one-item handoff for that
      // case; for late local results in the same session, an acknowledged
      // native target can still skip it.
      const needsNativeHandoff = forceNativeHandoff || nativeSelectionRef.current !== handoffTarget;
      session.awaitingTarget = needsNativeHandoff;
      setSelectedItemId(handoffTarget);
      if (needsNativeHandoff) {
        // The target is initially rendered by itself so Raycast cannot retain
        // an old native row. The handoff version schedules that isolated
        // render; it intentionally does not remount the complete List.
        setHandoffVersion((version) => version + 1);
      }
    };

    if (isNewSession) {
      const session: SelectionSession = {
        key,
        currentTabId: currentTabItemId,
        awaitingTarget: false,
        userNavigated: false,
      };
      selectionSessionRef.current = session;
      beginAutomaticSelection(session, automaticTarget, true);
      // A reopened Command Bar always starts a new session here. Opening a
      // bookmark, history item, search result, or typed address can create a
      // brand new Orion tab, and - unlike switching to an already-open tab -
      // we cannot know that new tab's identity in advance, so there is no
      // safe optimistic update for it: only a real Orion round trip resolves
      // it. Kick that off now instead of waiting for the next
      // `refreshWhileOpen` poll tick (up to a second away), so a reopened
      // Command Bar picks it up sooner.
      void refresh();
      return;
    }

    // Switching to a different Orion tab is a new external context, not List
    // navigation. `useTabs({ refreshWhileOpen: true })` polls Orion while this
    // command stays visible, so the user can switch tabs without leaving the
    // Command Bar. In that case the new current tab must replace a selection
    // remembered from the prior one, even if Ctrl+N/P was used since. This
    // compares tab identity only (not the URL), so navigating within the
    // already-current tab does not re-trigger this handoff.
    if (!hasQuery && currentTabItemId && previous.currentTabId !== currentTabItemId) {
      previous.userNavigated = false;
      previous.currentTabId = currentTabItemId;
      beginAutomaticSelection(previous, currentTabItemId, true);
      return;
    }

    // Local Tabs, Bookmarks, and History resolve independently. A late winner
    // is entitled to focus only while the user has not navigated deliberately.
    // For an unchanged empty-query current tab, background data refreshes must
    // never reclaim focus after the user starts native List navigation.
    if (!previous.userNavigated && previous.target !== automaticTarget) {
      const canUpdateEmptyQueryTarget = hasQuery || previous.target === undefined;
      if (canUpdateEmptyQueryTarget) {
        beginAutomaticSelection(previous, automaticTarget);
      }
    }
  }, [query, selectedProfileId, automaticTarget]);

  const activeSelectionSession = selectionSessionRef.current;
  const isHandingOffAutomaticTarget =
    !!automaticTarget &&
    activeSelectionSession?.awaitingTarget &&
    (activeSelectionSession.target === automaticTarget || activeSelectionSession.postHandoffTarget === automaticTarget);

  // `onSelectionChange` has no keyboard-event information. Waiting for its
  // target acknowledgement can therefore consume the first Ctrl+N/P: Raycast
  // may emit that acknowledgement only when the user presses a key. Complete
  // the one-item handoff on the next event-loop turn instead. At that point
  // the query-scoped selectedItemId has already been committed to the native
  // List, and every later selection change can safely be treated as native
  // navigation by the user.
  useEffect(() => {
    if (!isHandingOffAutomaticTarget) return;

    const session = selectionSessionRef.current;
    const sessionKey = session?.key;
    const target = session?.target;
    // Current Tab uses a temporary item ID. This is only a fallback: when the
    // native List acknowledges that item we wait a short settle period below.
    // Otherwise, retain the isolated view long enough for that acknowledgement
    // before expanding the full list.
    const delay = session?.postHandoffTarget ? CURRENT_TAB_HANDOFF_FALLBACK_MS : 0;
    const timer = setTimeout(() => {
      const current = selectionSessionRef.current;
      if (!current || current.key !== sessionKey || current.target !== target || !current.awaitingTarget) return;
      if (current.currentTabHandoffConfirmed) return;

      const finalTarget = current.postHandoffTarget ?? target;
      current.awaitingTarget = false;
      current.target = finalTarget;
      current.postHandoffTarget = undefined;
      current.currentTabHandoffConfirmed = false;
      current.awaitingFinalTargetAcknowledgement = false;
      nativeSelectionRef.current = finalTarget ?? null;
      setSelectedItemId(finalTarget);
      setHandoffVersion((version) => version + 1);
      if (!hasQuery && finalTarget && finalTarget === currentTabItemId) {
        releaseCurrentTabToNativeList(current, finalTarget);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [automaticTarget, isHandingOffAutomaticTarget]);

  return (
    <List
      key={listKey}
      isLoading={isLoading}
      filtering={false}
      throttle
      searchText={query}
      onSearchTextChange={(nextQuery) => {
        if (nextQuery !== query) {
          resetSelectionSession(selectedProfileId, nextQuery);
        }
        setQuery(nextQuery);
      }}
      {...(listSelectedItemId ? { selectedItemId: listSelectedItemId } : {})}
      onSelectionChange={(id) => {
        const session = selectionSessionRef.current;
        if (!session) {
          nativeSelectionRef.current = id;
          return;
        }

        if (session?.awaitingTarget) {
          // The List may emit an old row while its native view is being
          // updated. It is not user navigation. Only the requested target
          // confirms that the handoff succeeded.
          if (id !== session.target) return;
          const finalTarget = session.postHandoffTarget ?? id;

          // A Current Tab handoff first selects a unique, single-row item.
          // Raycast confirms that item before its native List has settled. If
          // the complete list is restored in the same callback, Raycast can
          // then emit a stale selection for row one, which used to be
          // mistaken for Ctrl+N/P navigation. Keep the single-row state for
          // one short settled commit, then expand with the real tab ID.
          if (session.postHandoffTarget) {
            const sessionKey = session.key;
            const temporaryTarget = session.target;
            session.currentTabHandoffConfirmed = true;
            setTimeout(() => {
              const current = selectionSessionRef.current;
              if (
                !current ||
                current.key !== sessionKey ||
                current.target !== temporaryTarget ||
                !current.awaitingTarget ||
                !current.currentTabHandoffConfirmed
              ) {
                return;
              }

              current.awaitingTarget = false;
              current.target = finalTarget;
              current.postHandoffTarget = undefined;
              current.currentTabHandoffConfirmed = false;
              // The isolated item is now being replaced with the real Open
              // Tabs section. Raycast can report its previous row one during
              // that replacement, before it acknowledges `finalTarget`.
              // That one native reconciliation is neither a search result nor
              // a Ctrl+N/P move, so fence it until the real item is confirmed.
              current.awaitingFinalTargetAcknowledgement = true;
              nativeSelectionRef.current = finalTarget;
              setSelectedItemId(finalTarget ?? undefined);
              setHandoffVersion((version) => version + 1);

              setTimeout(() => {
                const acknowledged = selectionSessionRef.current;
                if (
                  acknowledged?.key === sessionKey &&
                  acknowledged.target === finalTarget &&
                  acknowledged.awaitingFinalTargetAcknowledgement
                ) {
                  // Acknowledgement is normally synchronous with the List
                  // update. Do not keep this fence past that short native
                  // reconciliation window: later Ctrl+N/P must be untouched.
                  acknowledged.awaitingFinalTargetAcknowledgement = false;
                  if (!hasQuery && finalTarget === currentTabItemId && finalTarget) {
                    releaseCurrentTabToNativeList(acknowledged, finalTarget);
                  }
                }
              }, CURRENT_TAB_FINAL_ACK_TIMEOUT_MS);
            }, CURRENT_TAB_HANDOFF_SETTLE_MS);
            return;
          }

          session.awaitingTarget = false;
          session.target = finalTarget;
          session.postHandoffTarget = undefined;
          session.currentTabHandoffConfirmed = false;
          session.awaitingFinalTargetAcknowledgement = false;
          nativeSelectionRef.current = finalTarget;
          setSelectedItemId(finalTarget ?? undefined);
          setHandoffVersion((version) => version + 1);
          return;
        }

        // A null selection is not user navigation.
        if (!id) {
          nativeSelectionRef.current = null;
          return;
        }

        // When the one-item Current Tab handoff expands into the complete
        // Open Tabs section, Raycast may first report the old first row and
        // only then acknowledge the controlled Current Tab. That first report
        // is an implementation detail of the native List, not a user move.
        // Hold navigation interpretation until the requested item is
        // acknowledged; a very short watchdog prevents this from affecting
        // real keyboard navigation if Raycast never sends that acknowledgement.
        if (session.awaitingFinalTargetAcknowledgement) {
          if (id === session.target) {
            session.awaitingFinalTargetAcknowledgement = false;
            nativeSelectionRef.current = id;
          }
          return;
        }

        // A repeated acknowledgement for the active target is not navigation.
        if (id === session.target) {
          nativeSelectionRef.current = id;
          return;
        }

        // Before the first tab snapshot arrives, Raycast selects the first
        // native row on its own. An empty Command Bar is meant to land on
        // Orion's current tab, so that provisional selection is not Ctrl+N/P
        // navigation and must not prevent the current tab from taking focus
        // when the asynchronous snapshot resolves. Once tabs have loaded,
        // normal native navigation remains fully uncontrolled.
        if (!hasQuery && tabs === undefined && !session.target && !session.userNavigated) {
          nativeSelectionRef.current = id;
          return;
        }

        // Web Search is Raycast's initial fallback item. Seeing it selected
        // does not prove that the user navigated, so a Top Hit which resolves
        // later must still be allowed to take focus. Moving past it does prove
        // an explicit navigation choice.
        if (!session.target && !session.userNavigated && id === "web-search") {
          nativeSelectionRef.current = id;
          return;
        }

        // Automatic Top Hit selection needs a controlled List only until the
        // user starts navigating. From then on, defer to Raycast's native
        // focus and scroll handling; continually controlling selectedItemId
        // causes visible scroll jumps after repeated Ctrl+N/Ctrl+P cycles.
        nativeSelectionRef.current = id;
        session.userNavigated = true;
        setSelectedItemId(undefined);
      }}
      searchBarPlaceholder="Search tabs, bookmarks, history, or the web"
      searchBarAccessory={
        <ProfileDropdown
          profiles={profiles}
          selectedProfileId={selectedProfileId}
          onProfileSelected={(profileId) => {
            if (profileId !== selectedProfileId) {
              resetSelectionSession(profileId, query);
            }
            setSelectedProfileId(profileId);
          }}
        />
      }
    >
      {address && (!isHandingOffAutomaticTarget || automaticTarget === openAddressItemId) && (
        <List.Section title="Open Address">
          <List.Item
            id={openAddressItemId}
            icon={Icon.Globe}
            title={`Open “${query.trim()}” in Default Browser`}
            subtitle={address}
            actions={
              <ActionPanel>
                <OpenInDefaultBrowserAction url={address} immediatePopToRoot />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {topHit && (!isHandingOffAutomaticTarget || automaticTarget === topHitItemId) && (
        <List.Section title="Top Hit">
          {topHit.kind === "tab" ? (
            <TabListItem
              id={topHitItemId}
              tab={topHit.tab}
              refresh={refresh}
              closeLaunchers
              immediatePopToRoot
              onActivate={markTabActive}
            />
          ) : (
            <UrlListItem id={topHitItemId} item={topHit.item} accessory={topHit.source} />
          )}
        </List.Section>
      )}

      {currentTab && isHandingOffAutomaticTarget && automaticTarget === currentTabItemId && (
        <List.Section title="Open Tabs">
          <TabListItem
            id={activeSelectionSession?.target}
            tab={currentTab}
            refresh={refresh}
            closeLaunchers
            immediatePopToRoot
            onActivate={markTabActive}
          />
        </List.Section>
      )}

      {!isHandingOffAutomaticTarget && hasQuery && (
        <List.Section title="Search the Web">
          <List.Item
            id="web-search"
            icon={Icon.MagnifyingGlass}
            title={`Search ${getSearchEngineName()} for “${query}”`}
            actions={
              <ActionPanel>
                <OpenInOrionAction url={buildSearchUrl(query)} title="Search in Orion" immediatePopToRoot />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {!isHandingOffAutomaticTarget && suggestionHits.length > 0 && (
        <List.Section title="Suggestions">
          {suggestionHits.map((s, i) => (
            <SuggestionListItem id={`suggestion-${i}-${s}`} key={`sugg-${i}-${s}`} suggestion={s} />
          ))}
        </List.Section>
      )}

      {!isHandingOffAutomaticTarget && tabSection.length > 0 && (
        <List.Section title={fuzzyTabSection.length > 0 ? "Open Tabs (Fuzzy Matches)" : "Open Tabs"}>
          {tabSection.map((t) => (
            <TabListItem
              id={t.is_current && !hasQuery ? currentTabItemId : tabKey(t)}
              key={tabKey(t)}
              tab={t}
              refresh={refresh}
              closeLaunchers
              immediatePopToRoot
              onActivate={markTabActive}
            />
          ))}
        </List.Section>
      )}

      {!isHandingOffAutomaticTarget && bookmarkSection.length > 0 && (
        <List.Section title="Bookmarks">
          {bookmarkSection.map((b) => (
            <UrlListItem id={`bm-${b.uuid}`} key={`bm-${b.uuid}`} item={b} />
          ))}
        </List.Section>
      )}

      {!isHandingOffAutomaticTarget && readingSection.length > 0 && (
        <List.Section title="Reading List">
          {readingSection.map((b) => (
            <UrlListItem id={`rl-${b.uuid}`} key={`rl-${b.uuid}`} item={b} />
          ))}
        </List.Section>
      )}

      {!isHandingOffAutomaticTarget && !permissionView && historySection.length > 0 && (
        <List.Section title="History">
          {historySection.map((h) => (
            <UrlListItem id={`hist-${h.id}`} key={`hist-${h.id}`} item={h} />
          ))}
        </List.Section>
      )}
    </List>
  );
}
