import {
  ActionPanel,
  Action,
  List,
  Icon,
  showToast,
  Toast,
  openExtensionPreferences,
  Color,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { authenticate, hasCredentials } from "./lib/auth";

interface SharedSearchHit {
  type: string;
  rank_one: string;
  rank_two?: { text: string } | null;
  rank_three?: string | null;
  rank_four?: { text: string } | null;
  rank_five?: string | null;
  search_path?: string;
  displayed_attributes?: Record<string, string>;
  score?: number;
  objectID: string;
}

interface AlgoliaResult {
  hits: SharedSearchHit[];
  nbHits: number;
  index: string;
}

const TYPE_META: Record<string, { icon: Icon; color: Color; label: string }> = {
  user: { icon: Icon.Person, color: Color.Blue, label: "Founder" },
  yc_company: { icon: Icon.Building, color: Color.Orange, label: "Company" },
  investor: { icon: Icon.BankNote, color: Color.Green, label: "Investor" },
  deal: { icon: Icon.Tag, color: Color.Purple, label: "Deal" },
  knowledge_base: {
    icon: Icon.Book,
    color: Color.Yellow,
    label: "Knowledge Base",
  },
  startup_library: {
    icon: Icon.Video,
    color: Color.Red,
    label: "Startup Library",
  },
  employer: {
    icon: Icon.Briefcase,
    color: Color.SecondaryText,
    label: "Employer",
  },
};

export default function Command() {
  if (!hasCredentials()) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Lock}
          title="Bookface Login Required"
          description="Set your YC username and password in extension preferences to search Bookface."
          actions={
            <ActionPanel>
              <Action
                title="Open Preferences"
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return <BookfaceSearch />;
}

function BookfaceSearch() {
  const [searchText, setSearchText] = useState("");

  const { data, isLoading } = useCachedPromise(
    async (query: string) => {
      if (!query) return [];
      try {
        const session = await authenticate();
        if (!session.algoliaKey) throw new Error("No Algolia key");

        const res = await fetch(
          `https://45bwzj1sgc-dsn.algolia.net/1/indexes/*/queries?` +
            new URLSearchParams({
              "x-algolia-application-id": "45BWZJ1SGC",
              "x-algolia-api-key": session.algoliaKey,
            }),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              requests: [
                {
                  query,
                  indexName: "Shared_Search_bookface_production",
                  params: "hitsPerPage=20",
                  clickAnalytics: true,
                },
              ],
            }),
          },
        );

        if (!res.ok) throw new Error(`Search failed: ${res.status}`);
        const data: { results: AlgoliaResult[] } = await res.json();
        return data.results[0]?.hits ?? [];
      } catch (e) {
        showToast({
          style: Toast.Style.Failure,
          title: "Search failed",
          message: String(e),
        });
        return [];
      }
    },
    [searchText],
    { keepPreviousData: true },
  );

  // Group results by type, filter out hits with no title
  const grouped = new Map<string, SharedSearchHit[]>();
  for (const hit of data ?? []) {
    if (!hit.rank_one && !hit.type) {
      continue;
    }
    const list = grouped.get(hit.type) ?? [];
    list.push(hit);
    grouped.set(hit.type, list);
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search all of Bookface..."
      onSearchTextChange={setSearchText}
      throttle
    >
      {Array.from(grouped.entries()).map(([type, hits]) => {
        const meta = TYPE_META[type] ?? {
          icon: Icon.Circle,
          color: Color.SecondaryText,
          label: type,
        };
        return (
          <List.Section
            key={type}
            title={meta.label}
            subtitle={`${hits.length}`}
          >
            {hits.map((hit) => {
              return <SearchHitItem key={hit.objectID} hit={hit} meta={meta} />;
            })}
          </List.Section>
        );
      })}
      {searchText && data && data.length === 0 && !isLoading && (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="No results found" />
      )}
    </List>
  );
}

function SearchHitItem({
  hit,
  meta,
}: {
  hit: SharedSearchHit;
  meta: { icon: Icon; color: Color; label: string };
}) {
  const subtitle = hit.rank_two?.text ?? hit.rank_three ?? "";
  const extra = hit.rank_four?.text ?? hit.rank_five ?? "";

  return (
    <List.Item
      icon={{ source: meta.icon, tintColor: meta.color }}
      title={String(hit.rank_one ?? "(untitled)") || "(untitled)"}
      subtitle={subtitle}
      accessories={[
        extra ? { text: extra } : {},
        {
          tag: { value: meta.label, color: meta.color },
        },
      ].filter((a) => Object.keys(a).length > 0)}
      actions={
        <ActionPanel title={hit.rank_one || "Result"}>
          {hit.search_path && (
            <Action.OpenInBrowser
              title="Open on Bookface"
              url={hit.search_path}
            />
          )}
          <Action.CopyToClipboard
            title="Copy Name"
            content={hit.rank_one}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          {hit.search_path && (
            <Action.CopyToClipboard
              title="Copy URL"
              content={hit.search_path}
              shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
