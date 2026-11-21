import { Action, ActionPanel, Icon, List, type LaunchProps } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { useState } from "react";
import { searchCompanies } from "./lib/api";
import { useCompanyOverview } from "./lib/company";
import { getStrings } from "./lib/strings";
import { formatAddress, formatCompactMoney, websiteUrl } from "./lib/format";
import { formatOrgnr } from "./lib/orgnr";
import { useStore } from "./lib/store";
import type { CompanySummary } from "./lib/types";
import { CompanyActions } from "./components/CompanyActions";
import { CompanyDetail, CompanyMetadata } from "./components/CompanyDetail";

type LaunchContext = { orgnr?: string; name?: string };

export default function Command(
  props: LaunchProps<{ arguments: Arguments.SearchCompanies; launchContext?: LaunchContext }>,
) {
  const context = props.launchContext;
  if (context?.orgnr) {
    return (
      <CompanyDetail isRoot company={{ orgnr: context.orgnr, name: context.name ?? formatOrgnr(context.orgnr) }} />
    );
  }
  return <SearchCompanies initialQuery={props.arguments.query ?? props.fallbackText ?? ""} />;
}

function SearchCompanies({ initialQuery }: { initialQuery: string }) {
  const t = getStrings();
  const [searchText, setSearchText] = useState(initialQuery);
  const [showDetail, setShowDetail] = useCachedState("show-detail", true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { favorites, recents } = useStore();
  const query = searchText.trim();

  const {
    data: results = [],
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(searchCompanies, [query], {
    execute: query.length > 0,
    keepPreviousData: true,
    failureToastOptions: { title: t.error },
  });

  const favoriteIds = new Set(favorites.map((c) => c.orgnr));
  const recentList = recents.filter((c) => !favoriteIds.has(c.orgnr));
  const sections: { key: string; title: string; items: CompanySummary[] }[] = query
    ? [{ key: "results", title: t.results, items: results }]
    : [
        { key: "favorites", title: t.favorites, items: favorites },
        { key: "recents", title: t.recents, items: recentList },
      ];
  const firstId = sections.flatMap((s) => s.items.map((c) => `${s.key}-${c.orgnr}`))[0];
  const activeId = selectedId ?? firstId;
  const toggleDetail = () => setShowDetail((value) => !value);

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={t.searchPlaceholder}
      isLoading={query.length > 0 && isLoading}
      isShowingDetail={showDetail && sections.some((s) => s.items.length > 0)}
      onSelectionChange={setSelectedId}
      throttle
    >
      {query && error && !isLoading ? (
        <List.EmptyView
          icon={Icon.Warning}
          title={t.error}
          description={error.message}
          actions={
            <ActionPanel>
              <Action title={t.retry} icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : query ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={isLoading ? t.searching : t.noResults}
          description={isLoading ? undefined : t.noResultsHint}
        />
      ) : (
        <List.EmptyView icon="extension-icon.png" title={t.emptyTitle} description={t.emptyHint} />
      )}
      {sections.map((section) => (
        <List.Section
          key={section.key}
          title={section.title}
          subtitle={section.items.length ? String(section.items.length) : undefined}
        >
          {section.items.map((company, index) => {
            const id = `${section.key}-${company.orgnr}`;
            const isFavorite = favoriteIds.has(company.orgnr);
            return (
              <List.Item
                key={id}
                id={id}
                title={company.name}
                subtitle={showDetail ? undefined : formatOrgnr(company.orgnr)}
                keywords={[company.orgnr, formatOrgnr(company.orgnr), company.city ?? ""]}
                accessories={
                  showDetail
                    ? undefined
                    : [
                        ...(isFavorite && section.key === "results" ? [{ icon: Icon.Star }] : []),
                        ...(company.form ? [{ tag: company.form }] : []),
                        ...(company.city ? [{ text: company.city, icon: Icon.Pin }] : []),
                      ]
                }
                detail={showDetail && id === activeId ? <CompanyListDetail company={company} /> : undefined}
                actions={
                  <SearchItemActions
                    company={company}
                    active={id === activeId}
                    onToggleDetail={toggleDetail}
                    recent={section.key === "recents"}
                    favoriteIndex={section.key === "favorites" ? index : undefined}
                    favoriteCount={section.key === "favorites" ? section.items.length : undefined}
                  />
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}

type SearchItemActionsProps = {
  company: CompanySummary;
  active: boolean;
  onToggleDetail: () => void;
  recent: boolean;
  favoriteIndex?: number;
  favoriteCount?: number;
};

function SearchItemActions(props: SearchItemActionsProps) {
  // Only the selected row fetches, and it shares the cache with the detail panel.
  const { company } = useCompanyOverview(props.active ? props.company.orgnr : undefined);
  const data = company.data?.data;
  return (
    <CompanyActions
      company={props.company}
      website={websiteUrl(data?.hjemmeside)}
      address={formatAddress(data?.forretningsadresse)}
      onToggleDetail={props.onToggleDetail}
      recent={props.recent}
      favoriteIndex={props.favoriteIndex}
      favoriteCount={props.favoriteCount}
    />
  );
}

function CompanyListDetail({ company }: { company: CompanySummary }) {
  const t = getStrings();
  const overview = useCompanyOverview(company.orgnr);
  const data = overview.company.data;
  const activity = (data?.data.aktivitet ?? []).join(" ").trim();
  // The panel's markdown area is short and a table gets clipped, so key figures go on one line.
  const latest = [...(overview.financials.data?.years ?? [])].sort((a, b) => b.year - a.year)[0];
  const figure = (title: string, value: unknown) =>
    typeof value === "number" ? `**${title}** ${formatCompactMoney(value * 1000, latest?.currency)}` : undefined;
  const figures = latest
    ? [
        `**${latest.year}**`,
        figure(t.revenue, latest.operatingRevenue),
        figure(t.netResult, latest.netIncome),
        figure(t.equity, latest.totalEquity),
      ]
        .filter(Boolean)
        .join(" · ")
    : undefined;
  const markdown = [`### ${company.name}`, activity, figures].filter(Boolean).join("\n\n");

  return (
    <List.Item.Detail
      isLoading={overview.isLoading}
      markdown={markdown}
      metadata={
        <CompanyMetadata
          variant="list"
          summary={company}
          overview={{ company: data, financials: overview.financials.data, roles: overview.roles.data }}
        />
      }
    />
  );
}
