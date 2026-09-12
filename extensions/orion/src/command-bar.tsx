import { useEffect, useState } from "react";
import { Action, ActionPanel, Icon, List } from "@raycast/api";

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

import { Bookmark, HistoryItem, Tab } from "./types";
import {
  buildSearchUrl,
  extractDomainName,
  getSearchEngineName,
  isLauncherTab,
  isWebAddress,
  normalizeWebAddress,
  splitSearchTerms,
} from "./utils";

const LIMITS = { tabs: 6, bookmarks: 6, reading: 4, history: 8 };
const TOP_HIT_ITEM_ID = "top-hit";
const OPEN_ADDRESS_ITEM_ID = "open-address";

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

const tabKey = (t: Tab) => `tab-${t.window_id}-${t.url}`;

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

function canonicalUrl(url: string): string {
  return normalizedAddress(url);
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
  if (aLastVisit !== bLastVisit) return bLastVisit.localeCompare(aLastVisit);
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

function uniqueUrls<T extends { url: string }>(items: T[], seen: Set<string>): T[] {
  return items.filter((item) => {
    const key = canonicalUrl(item.url);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function Command() {
  const [query, setQuery] = useState("");
  // This is deliberately only an initial focus request. Keeping the current
  // selection in React state makes List controlled, which disrupts Raycast's
  // native Ctrl+N/Ctrl+P scrolling behavior.
  const [autoSelectedItemId, setAutoSelectedItemId] = useState<string>();
  const q = query.trim().toLowerCase();
  const hasQuery = q.length > 0;

  const { profiles } = useProfiles();
  const { selectedProfileId, setSelectedProfileId } = useSelectedProfileId("Defaults");

  const { tabs, refresh } = useTabs();
  const { bookmarks, isLoading: bookmarksLoading } = useBookmarks(selectedProfileId);
  const { readingList } = useReadingList(selectedProfileId);
  const {
    data: history,
    isLoading: historyLoading,
    permissionView,
  } = useHistorySearch(selectedProfileId, hasQuery ? query : undefined);
  const { suggestions, isLoading: suggestionsLoading } = useSuggestions(query);

  const isLoading = !profiles || tabs === undefined || bookmarksLoading || historyLoading || suggestionsLoading;

  // Never show the launcher tabs in the list itself.
  const openTabs: Tab[] = (tabs ?? []).filter((t) => !isLauncherTab(t.url));

  // Filter each source against the query (open tabs are always shown when empty).
  const tabHits: Tab[] = openTabs.filter((t) => !hasQuery || relevance(q, t.title, t.url) > 0);
  const bookmarkHits: Bookmark[] = hasQuery
    ? bookmarks.filter((b) => relevance(q, b.title, b.url) > 0 || b.folders.some((f) => textMatchesQuery(q, f)))
    : [];
  const readingHits: Bookmark[] = hasQuery ? (readingList ?? []).filter((b) => relevance(q, b.title, b.url) > 0) : [];
  const historyHits: HistoryItem[] = hasQuery ? (history ?? []).filter((h) => relevance(q, h.title, h.url) > 0) : [];
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
  const seenUrls = new Set(topUrl ? [canonicalUrl(topUrl)] : []);
  const exactTabSection = uniqueUrls(
    tabHits.filter((t) => tabKey(t) !== topTabKey),
    seenUrls,
  ).slice(0, hasQuery ? LIMITS.tabs : tabHits.length);
  const tabSection = exactTabSection;
  const bookmarkSection = uniqueUrls(
    bookmarkHits.filter((b) => `bm-${b.uuid}` !== topUrlKey),
    seenUrls,
  ).slice(0, LIMITS.bookmarks);
  const readingSection = uniqueUrls(
    readingHits.filter((b) => `rl-${b.uuid}` !== topUrlKey),
    seenUrls,
  ).slice(0, LIMITS.reading);
  const historySection = uniqueUrls(
    historyHits.filter((h) => `hist-${h.id}` !== topUrlKey),
    seenUrls,
  ).slice(0, LIMITS.history);
  const address = isWebAddress(query) ? normalizeWebAddress(query) : undefined;

  // Local data arrives asynchronously. First render the new result set, then
  // request focus on the next tick. Without the two phases, Raycast can report
  // the old web-search selection and cancel the Top Hit focus request.
  useEffect(() => {
    const target = topHit ? TOP_HIT_ITEM_ID : address ? OPEN_ADDRESS_ITEM_ID : undefined;
    setAutoSelectedItemId(undefined);
    if (!target) return;

    let releaseTimer: ReturnType<typeof setTimeout> | undefined;
    const focusTimer = setTimeout(() => {
      setAutoSelectedItemId(target);
      // Give Raycast time to apply the programmatic focus, then immediately
      // return navigation ownership so Ctrl+N/Ctrl+P stays native.
      releaseTimer = setTimeout(() => setAutoSelectedItemId(undefined), 125);
    }, 0);

    return () => {
      clearTimeout(focusTimer);
      if (releaseTimer) clearTimeout(releaseTimer);
    };
  }, [query, topHit?.key, address]);

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      throttle
      onSearchTextChange={setQuery}
      selectedItemId={autoSelectedItemId}
      searchBarPlaceholder="Search tabs, bookmarks, history, or the web"
      searchBarAccessory={
        <ProfileDropdown
          profiles={profiles}
          selectedProfileId={selectedProfileId}
          onProfileSelected={setSelectedProfileId}
        />
      }
    >
      {topHit && (
        <List.Section title="Top Hit">
          {topHit.kind === "tab" ? (
            <TabListItem id={TOP_HIT_ITEM_ID} tab={topHit.tab} refresh={refresh} closeLaunchers />
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
                <Action.OpenInBrowser title="Open in Default Browser" url={address} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {hasQuery && (
        <List.Section title="Search the Web">
          <List.Item
            icon={Icon.MagnifyingGlass}
            title={`Search ${getSearchEngineName()} for “${query}”`}
            actions={
              <ActionPanel>
                <OpenInOrionAction url={buildSearchUrl(query)} title="Search in Orion" />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {suggestionHits.length > 0 && (
        <List.Section title="Suggestions">
          {suggestionHits.map((s, i) => (
            <SuggestionListItem key={`sugg-${i}-${s}`} suggestion={s} />
          ))}
        </List.Section>
      )}

      {tabSection.length > 0 && (
        <List.Section title="Open Tabs">
          {tabSection.map((t) => (
            <TabListItem key={tabKey(t)} tab={t} refresh={refresh} closeLaunchers />
          ))}
        </List.Section>
      )}

      {bookmarkSection.length > 0 && (
        <List.Section title="Bookmarks">
          {bookmarkSection.map((b) => (
            <UrlListItem key={`bm-${b.uuid}`} item={b} />
          ))}
        </List.Section>
      )}

      {readingSection.length > 0 && (
        <List.Section title="Reading List">
          {readingSection.map((b) => (
            <UrlListItem key={`rl-${b.uuid}`} item={b} />
          ))}
        </List.Section>
      )}

      {!permissionView && historySection.length > 0 && (
        <List.Section title="History">
          {historySection.map((h) => (
            <UrlListItem key={`hist-${h.id}`} item={h} />
          ))}
        </List.Section>
      )}
    </List>
  );
}
