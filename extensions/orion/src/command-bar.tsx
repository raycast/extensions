import { useEffect, useRef, useState } from "react";
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

type SelectionSession = {
  key: string;
  target?: string;
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
  const selectionSessionRef = useRef<SelectionSession | undefined>(undefined);
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
  // put the entire List into a loading state: by the time either can be true,
  // profiles/tabs/bookmarks have already resolved, so there is no genuine
  // "nothing to show yet" case being masked - only a loading flicker on every
  // keystroke would be added for no benefit.
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

  // Pick the single best local match as Top Hit.
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
  // Fuzzy/pinyin results are a fallback only when there is no exact local tab
  // match at all; `seenUrls` already reflects Top Hit at this point (exact
  // matches are empty whenever this runs), so this only needs to exclude Top
  // Hit's own destination, not re-check against exactTabSection.
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

  // Keep selection controlled while the local sources resolve. A session lasts
  // for one query/profile pair: it auto-selects a Top Hit until the user
  // navigates, after which slower data must not steal their selection.
  useEffect(() => {
    const target = topHit ? TOP_HIT_ITEM_ID : address ? OPEN_ADDRESS_ITEM_ID : undefined;
    const key = `${selectedProfileId}\u0000${query}`;
    const previous = selectionSessionRef.current;
    const isNewSession = previous?.key !== key;

    if (isNewSession) {
      selectionSessionRef.current = {
        key,
        target,
        awaitingTarget: !!target,
        userNavigated: false,
      };
      setSelectedItemId(target);
      return;
    }

    // Local tabs, bookmarks, and history resolve at different times. Keep
    // following the best candidate only until the user has made a choice.
    if (!previous.userNavigated && previous.target !== target) {
      previous.target = target;
      previous.awaitingTarget = !!target;
      setSelectedItemId(target);
      return;
    }
  }, [query, selectedProfileId, topHit?.key, address]);

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      throttle
      onSearchTextChange={(nextQuery) => {
        if (nextQuery !== query) {
          resetSelectionSession(selectedProfileId, nextQuery);
        }
        setQuery(nextQuery);
      }}
      {...(selectedItemId ? { selectedItemId } : {})}
      onSelectionChange={(id) => {
        const session = selectionSessionRef.current;
        if (session?.awaitingTarget) {
          // Ignore the stale selection that Raycast can report while replacing
          // an older result set. The matching callback acknowledges the new
          // controlled selection without relying on a timing threshold.
          if (id !== session.target) return;
          session.awaitingTarget = false;
          setSelectedItemId(id ?? undefined);
          return;
        }

        // Web Search is Raycast's initial fallback item. Seeing it selected
        // does not prove that the user navigated, so a Top Hit which resolves
        // later must still be allowed to take focus. Moving past it does prove
        // an explicit navigation choice.
        if (!session?.target && !session?.userNavigated && id === "web-search") {
          setSelectedItemId(undefined);
          return;
        }

        // Automatic Top Hit selection needs a controlled List only until the
        // user starts navigating. From then on, defer to Raycast's native
        // focus and scroll handling; continually controlling selectedItemId
        // causes visible scroll jumps after repeated Ctrl+N/Ctrl+P cycles.
        if (session) session.userNavigated = true;
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
      {topHit && (
        <List.Section title="Top Hit">
          {topHit.kind === "tab" ? (
            <TabListItem
              id={TOP_HIT_ITEM_ID}
              tab={topHit.tab}
              refresh={refresh}
              closeLaunchers
              immediatePopToRoot
              onActivate={markTabActive}
            />
          ) : (
            <UrlListItem id={TOP_HIT_ITEM_ID} item={topHit.item} accessory={topHit.source} />
          )}
        </List.Section>
      )}

      {address && (
        <List.Section title="Open Address">
          <List.Item
            id={OPEN_ADDRESS_ITEM_ID}
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

      {hasQuery && (
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

      {suggestionHits.length > 0 && (
        <List.Section title="Suggestions">
          {suggestionHits.map((s, i) => (
            <SuggestionListItem id={`suggestion-${i}-${s}`} key={`sugg-${i}-${s}`} suggestion={s} />
          ))}
        </List.Section>
      )}

      {tabSection.length > 0 && (
        <List.Section title={fuzzyTabSection.length > 0 ? "Open Tabs (Fuzzy Matches)" : "Open Tabs"}>
          {tabSection.map((t) => (
            <TabListItem
              id={tabKey(t)}
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

      {bookmarkSection.length > 0 && (
        <List.Section title="Bookmarks">
          {bookmarkSection.map((b) => (
            <UrlListItem id={`bm-${b.uuid}`} key={`bm-${b.uuid}`} item={b} />
          ))}
        </List.Section>
      )}

      {readingSection.length > 0 && (
        <List.Section title="Reading List">
          {readingSection.map((b) => (
            <UrlListItem id={`rl-${b.uuid}`} key={`rl-${b.uuid}`} item={b} />
          ))}
        </List.Section>
      )}

      {!permissionView && historySection.length > 0 && (
        <List.Section title="History">
          {historySection.map((h) => (
            <UrlListItem id={`hist-${h.id}`} key={`hist-${h.id}`} item={h} />
          ))}
        </List.Section>
      )}
    </List>
  );
}
