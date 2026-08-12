import { useState } from "react";
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

import { Bookmark, HistoryItem, Tab } from "./types";
import { buildSearchUrl, extractDomainName, getSearchEngineName, isLauncherTab, splitSearchTerms } from "./utils";

const LIMITS = { tabs: 6, bookmarks: 6, reading: 4, history: 8 };

// 3 = prefix match on title/domain, 2 = substring of title/domain, 1 = substring of url.
function scoreTerm(term: string, title: string, domain: string, url: string): number {
  if (title.startsWith(term) || domain.startsWith(term)) return 3;
  if (title.includes(term) || domain.includes(term)) return 2;
  if (url.includes(term)) return 1;
  return 0;
}

function relevance(query: string, title: string | undefined, url: string): number {
  const t = (title ?? "").toLowerCase();
  const d = extractDomainName(url).toLowerCase();
  const u = url.toLowerCase();

  const phraseScore = scoreTerm(query, t, d, u);
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

type Hit = { kind: "tab"; tab: Tab; key: string } | { kind: "url"; item: UrlItem; source: string; key: string };

const tabKey = (t: Tab) => `tab-${t.window_id}-${t.url}`;

export default function Command() {
  const [query, setQuery] = useState("");
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

  // Pick the single best local match as the Top Hit, preferring tabs > bookmarks > reading list > history.
  let topHit: Hit | undefined;
  if (hasQuery) {
    const candidates: { hit: Hit; score: number }[] = [];
    tabHits.forEach((t) =>
      candidates.push({ hit: { kind: "tab", tab: t, key: tabKey(t) }, score: relevance(q, t.title, t.url) + 0.4 }),
    );
    bookmarkHits.forEach((b) =>
      candidates.push({
        hit: { kind: "url", item: b, source: "Bookmark", key: `bm-${b.uuid}` },
        score: relevance(q, b.title, b.url) + 0.3,
      }),
    );
    readingHits.forEach((b) =>
      candidates.push({
        hit: { kind: "url", item: b, source: "Reading List", key: `rl-${b.uuid}` },
        score: relevance(q, b.title, b.url) + 0.2,
      }),
    );
    historyHits.forEach((h) =>
      candidates.push({
        hit: { kind: "url", item: h, source: "History", key: `hist-${h.id}` },
        score: relevance(q, h.title, h.url) + 0.1,
      }),
    );
    topHit = candidates.sort((a, b) => b.score - a.score)[0]?.hit;
  }

  // Drop the top hit from its own section to avoid showing it twice.
  const topTabKey = topHit?.kind === "tab" ? topHit.key : undefined;
  const topUrlKey = topHit?.kind === "url" ? topHit.key : undefined;

  const tabSection = tabHits.filter((t) => tabKey(t) !== topTabKey).slice(0, hasQuery ? LIMITS.tabs : tabHits.length);
  const bookmarkSection = bookmarkHits.filter((b) => `bm-${b.uuid}` !== topUrlKey).slice(0, LIMITS.bookmarks);
  const readingSection = readingHits.filter((b) => `rl-${b.uuid}` !== topUrlKey).slice(0, LIMITS.reading);
  const historySection = historyHits.filter((h) => `hist-${h.id}` !== topUrlKey).slice(0, LIMITS.history);

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      throttle
      onSearchTextChange={setQuery}
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
            <TabListItem tab={topHit.tab} refresh={refresh} closeLaunchers />
          ) : (
            <UrlListItem item={topHit.item} accessory={topHit.source} />
          )}
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
