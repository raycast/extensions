import { Action, ActionPanel, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { useCachedState, usePromise, withCache } from "@raycast/utils";
import { useMemo } from "react";
import { StartupDetailView } from "./components/startup-detail";
import { formatUsd, listStartups, type Startup } from "./lib/api";

const PAGE_SIZE = 50;

const SORT_OPTIONS = [
  { value: "revenue-desc", title: "Revenue: High to Low" },
  { value: "revenue-asc", title: "Revenue: Low to High" },
  { value: "price-desc", title: "Price: High to Low" },
  { value: "price-asc", title: "Price: Low to High" },
  { value: "multiple-asc", title: "Multiple: Low to High" },
  { value: "multiple-desc", title: "Multiple: High to Low" },
  { value: "growth-desc", title: "Growth: High to Low" },
  { value: "growth-asc", title: "Growth: Low to High" },
  { value: "listed-desc", title: "Recently Listed" },
  { value: "listed-asc", title: "Oldest Listings" },
  { value: "best-deal", title: "Best Deal" },
] as const;

const CATEGORY_OPTIONS = [
  "all",
  "ai",
  "saas",
  "developer-tools",
  "fintech",
  "marketing",
  "ecommerce",
  "productivity",
  "design-tools",
  "no-code",
  "analytics",
  "crypto-web3",
  "education",
  "health-fitness",
  "social-media",
  "content-creation",
  "sales",
  "customer-support",
  "recruiting",
  "real-estate",
  "travel",
  "legal",
  "security",
  "iot-hardware",
  "green-tech",
  "entertainment",
  "games",
  "community",
  "news-magazines",
  "utilities",
  "marketplace",
  "mobile-apps",
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]["value"];
type CategoryValue = (typeof CATEGORY_OPTIONS)[number];

type PaginatedData = {
  data: Startup[];
  hasMore: boolean;
  total: number;
};

type SortSubmenuProps = {
  sort: SortValue;
  onSelectSort: (nextSort: SortValue) => void;
};

function SortSubmenu({ sort, onSelectSort }: SortSubmenuProps) {
  const selectedSortLabel = SORT_OPTIONS.find((option) => option.value === sort)?.title ?? "Revenue: High to Low";

  return (
    <ActionPanel.Submenu
      title={`Sort: ${selectedSortLabel}`}
      icon={Icon.Switch}
      shortcut={{ modifiers: ["cmd"], key: "s" }}
    >
      {SORT_OPTIONS.map((option) => (
        <Action
          key={option.value}
          title={option.value === sort ? `${option.title} (Selected)` : option.title}
          icon={option.value === sort ? Icon.Checkmark : Icon.ArrowRight}
          onAction={() => onSelectSort(option.value)}
        />
      ))}
    </ActionPanel.Submenu>
  );
}

const fetchStartupsPage = withCache(
  async (page: number, sort: SortValue, category: CategoryValue): Promise<PaginatedData> => {
    const response = await listStartups({
      page,
      limit: PAGE_SIZE,
      sort,
      category: category === "all" ? undefined : category,
    });

    return {
      data: response.data,
      hasMore: response.meta.hasMore,
      total: response.meta.total,
    };
  },
  {
    maxAge: 5 * 60 * 1000,
  },
);

function startupUrl(slug: string): string {
  return `https://trustmrr.com/startup/${slug}`;
}

function subtitle(startup: Startup): string {
  if (startup.category && startup.country) {
    return `${startup.category} - ${startup.country}`;
  }

  return startup.category ?? startup.country ?? "";
}

function mergeStartups(existing: Startup[], incoming: Startup[]): Startup[] {
  const merged = [...existing];
  const seen = new Set(existing.map((startup) => startup.slug));

  for (const startup of incoming) {
    if (!seen.has(startup.slug)) {
      merged.push(startup);
      seen.add(startup.slug);
    }
  }

  return merged;
}

export default function Command() {
  const [sort, setSort] = useCachedState<SortValue>("list-startups-selected-sort", "revenue-desc");
  const [category, setCategory] = useCachedState<CategoryValue>("list-startups-selected-category", "all");
  const [cachedStartupsByQuery, setCachedStartupsByQuery] = useCachedState<Record<string, Startup[]>>(
    "list-startups-cached-pages",
    {},
  );
  const [cachedTotalsByQuery, setCachedTotalsByQuery] = useCachedState<Record<string, number>>(
    "list-startups-total-counts",
    {},
  );

  const cacheScopeKey = `${sort}:${category}`;
  const cachedStartups = cachedStartupsByQuery[cacheScopeKey] ?? [];

  const selectedSortLabel = useMemo(() => {
    return SORT_OPTIONS.find((option) => option.value === sort)?.title ?? "Revenue: High to Low";
  }, [sort]);

  const { data, isLoading, pagination, revalidate } = usePromise(
    (activeSort: SortValue, activeCategory: CategoryValue) => async (options: { page: number }) => {
      const pageData = await fetchStartupsPage(options.page + 1, activeSort, activeCategory);

      setCachedTotalsByQuery((previous) => {
        if (previous[cacheScopeKey] === pageData.total) {
          return previous;
        }

        return {
          ...previous,
          [cacheScopeKey]: pageData.total,
        };
      });

      return pageData;
    },
    [sort, category],
    {
      onError: async (error: unknown) => {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch startups",
          message: error instanceof Error ? error.message : String(error),
        });
      },
      onData: async (fetchedStartups: Startup[]) => {
        setCachedStartupsByQuery((previous) => {
          const existing = previous[cacheScopeKey] ?? [];
          const merged = mergeStartups(existing, fetchedStartups);

          if (merged.length === existing.length) {
            return previous;
          }

          return {
            ...previous,
            [cacheScopeKey]: merged,
          };
        });
      },
    },
  );

  const startups = useMemo(() => mergeStartups(cachedStartups, data ?? []), [cachedStartups, data]);
  const totalCount = cachedTotalsByQuery[cacheScopeKey] ?? startups.length;

  async function refreshStartups() {
    setCachedStartupsByQuery((previous) => {
      if (!(cacheScopeKey in previous)) {
        return previous;
      }

      const next = { ...previous };
      delete next[cacheScopeKey];
      return next;
    });
    setCachedTotalsByQuery((previous) => {
      if (!(cacheScopeKey in previous)) {
        return previous;
      }

      const next = { ...previous };
      delete next[cacheScopeKey];
      return next;
    });

    fetchStartupsPage.clearCache();
    await revalidate();
  }

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      searchBarPlaceholder="Filter loaded and cached startups by name, slug, or category"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by category"
          storeValue
          value={category}
          onChange={(newValue) => setCategory(newValue as CategoryValue)}
        >
          <List.Dropdown.Item title="All Categories" value="all" />
          {CATEGORY_OPTIONS.filter((option) => option !== "all").map((option) => (
            <List.Dropdown.Item key={option} title={option} value={option} />
          ))}
        </List.Dropdown>
      }
      navigationTitle={`TrustMRR List Startups • ${totalCount} total • ${selectedSortLabel}${category === "all" ? "" : ` • ${category}`}`}
      actions={
        <ActionPanel>
          <SortSubmenu sort={sort} onSelectSort={setSort} />
          <Action
            title="Reset Filters"
            icon={Icon.XMarkCircle}
            onAction={() => {
              setSort("revenue-desc");
              setCategory("all");
            }}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={refreshStartups}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    >
      {startups.map((startup) => (
        <List.Item
          key={startup.slug}
          title={startup.name}
          subtitle={subtitle(startup)}
          icon={startup.icon ?? Icon.Building}
          accessories={[
            {
              text: formatUsd(startup.revenue.last30Days),
              tooltip: "Revenue (30d)",
            },
            {
              tag: startup.onSale ? "For Sale" : "Private",
              tooltip: "Sale status",
            },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Details"
                target={<StartupDetailView slug={startup.slug} />}
                icon={Icon.Sidebar}
              />

              {startup.website ? (
                <Action.OpenInBrowser
                  title="Open Website"
                  url={startup.website}
                  shortcut={Keyboard.Shortcut.Common.Open}
                />
              ) : null}
              <Action.OpenInBrowser
                title="Open on TrustMRR"
                url={startupUrl(startup.slug)}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
              />

              <SortSubmenu sort={sort} onSelectSort={setSort} />

              <Action.CopyToClipboard
                title="Copy Slug"
                content={startup.slug}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />

              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={refreshStartups}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
