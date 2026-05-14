import { Action, ActionPanel, Color, Icon, List, Toast, open, showToast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { PackageDetailView } from "./package-detail";
import {
  buildPackageUrl,
  getCategories,
  getPackageDetailWithCache,
  getSearchResults,
} from "./data";
import { CategorySummary, SearchResponseItem } from "./types";
import { PAGE_SIZE } from "./constants";
import { normalizeExternalUrl } from "./url";

type LoadingState = "initial" | "search" | "idle";
export default function SearchPackagesCommand() {
  const [searchText, setSearchText] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [results, setResults] = useState<SearchResponseItem[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>("initial");
  const [errorMessage, setErrorMessage] = useState<string>();
  const [page, setPage] = useState<number>(1);
  const [isPaginating, setIsPaginating] = useState(false);

  const debouncedSearchText = useDebouncedValue(searchText, 400);
  const isLoading = loadingState !== "idle";

  useEffect(() => {
    let ignore = false;

    async function loadCategories() {
      try {
        const data = await getCategories();
        if (!ignore) {
          setCategories(data);
          setLoadingState((current: LoadingState) => (current === "initial" ? "idle" : current));
        }
      } catch (error) {
        if (!ignore) {
          console.error(error);
          setLoadingState((current: LoadingState) => (current === "initial" ? "idle" : current));
        }
      }
    }

    loadCategories();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function runSearch() {
      if (!debouncedSearchText.trim()) {
        setResults([]);
        setLoadingState((current: LoadingState) => (current === "initial" ? current : "idle"));
        setErrorMessage(undefined);
        return;
      }

      setLoadingState("search");
      setErrorMessage(undefined);

      try {
        const data = await getSearchResults(debouncedSearchText);
        if (!ignore) {
          setResults(data);
          setPage(1);
        }
      } catch (error) {
        if (ignore) {
          return;
        }
        const message = error instanceof Error ? error.message : "Unknown error";
        setErrorMessage(message);
        await showToast({ style: Toast.Style.Failure, title: "Search failed", message });
      } finally {
        if (!ignore) {
          setLoadingState((current: LoadingState) => (current === "initial" ? current : "idle"));
        }
      }
    }

    runSearch();
    return () => {
      ignore = true;
    };
  }, [debouncedSearchText]);

  useEffect(() => {
    setPage(1);
  }, [categoryFilter]);

  const filteredResults = useMemo(() => {
    if (categoryFilter === "all") {
      return results;
    }
    return results.filter(
      (item: SearchResponseItem) => item.category?.toLowerCase() === categoryFilter.toLowerCase(),
    );
  }, [results, categoryFilter]);

  const paginatedResults = useMemo<SearchResponseItem[]>(
    () => filteredResults.slice(0, page * PAGE_SIZE),
    [filteredResults, page],
  );
  const hasMore = filteredResults.length > paginatedResults.length;
  const canResetFilters = Boolean(searchText.trim()) || categoryFilter !== "all";
  const emptyViewActions = (
    <ActionPanel>
      {canResetFilters && (
        <Action
          icon={Icon.ArrowCounterClockwise}
          title="Reset Search and Filters"
          onAction={() => {
            setSearchText("");
            setCategoryFilter("all");
          }}
        />
      )}
      <Action.OpenInBrowser title="Open djangopackages.org" url="https://djangopackages.org/" />
    </ActionPanel>
  );

  return (
    <List
      filtering={false}
      throttle
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Django packages..."
      searchBarAccessory={
        <CategoryDropdown
          categories={categories}
          onChange={(value) => setCategoryFilter(value)}
          value={categoryFilter}
        />
      }
      pagination={{
        pageSize: PAGE_SIZE,
        hasMore,
        onLoadMore: () => {
          if (!hasMore || isPaginating) {
            return;
          }
          setIsPaginating(true);
          setTimeout(() => {
            setPage((prevPage: number) => prevPage + 1);
            setIsPaginating(false);
          }, 50);
        },
      }}
    >
      {paginatedResults.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={errorMessage ? Icon.ExclamationMark : Icon.MagnifyingGlass}
          title={getEmptyStateTitle({ errorMessage, searchText, loadingState })}
          description={getEmptyStateDescription({ errorMessage, searchText })}
          actions={emptyViewActions}
        />
      ) : (
        <>
          {paginatedResults.map((item: SearchResponseItem) => (
            <PackageListItem key={item.slug} item={item} />
          ))}
          {isPaginating && (
            <List.Item
              key="pagination-spinner"
              title="Loading more results"
              subtitle="Preparing the next page"
              icon={Icon.CircleProgress}
            />
          )}
        </>
      )}
    </List>
  );
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function PackageListItem({ item }: { item: SearchResponseItem }) {
  const accessories: List.Item.Accessory[] = [];

  if (item.category) {
    accessories.push({
      tag: { value: item.category, color: Color.Blue },
      tooltip: `Category: ${item.category}`,
    });
  }

  if (typeof item.repo_watchers === "number") {
    accessories.push({
      text: `${item.repo_watchers.toLocaleString()} ★`,
      tooltip: "Repository watchers",
    });
  }

  return (
    <List.Item
      title={item.title}
      subtitle={item.description}
      icon={Icon.Box}
      accessories={accessories}
      actions={<PackageActions item={item} />}
    />
  );
}

function PackageActions({ item }: { item: SearchResponseItem }) {
  const packageUrl = buildPackageUrl(item.slug);

  return (
    <ActionPanel>
      <Action.Push
        icon={Icon.Sidebar}
        title="View Details"
        target={<PackageDetailView slug={item.slug} fallbackDescription={item.description} />}
      />
      <OpenResourceAction slug={item.slug} field="documentation_url" title="Open Documentation" />
      <OpenResourceAction slug={item.slug} field="pypi_url" title="Open PyPI" />
      <Action.OpenInBrowser url={packageUrl} title="Open DjangoPackages Page" icon={Icon.Globe} />
      <ActionPanel.Section title="Additional">
        <OpenResourceAction slug={item.slug} field="repo_url" title="Open Repository" />
        <Action.CopyToClipboard content={packageUrl} title="Copy Package URL" />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

interface OpenResourceActionProps {
  slug: string;
  field: "documentation_url" | "repo_url" | "pypi_url";
  title: string;
}

function OpenResourceAction({ slug, field, title }: OpenResourceActionProps) {
  const icon =
    field === "documentation_url" ? Icon.Book : field === "repo_url" ? Icon.Terminal : Icon.Box;
  return (
    <Action
      title={title}
      icon={icon}
      onAction={async () => {
        const toast = await showToast({ style: Toast.Style.Animated, title });
        try {
          const detail = await getPackageDetailWithCache(slug);
          const url = detail[field];
          const normalizedUrl = normalizeExternalUrl(url);
          if (normalizedUrl) {
            toast.hide();
            await open(normalizedUrl);
          } else {
            toast.style = Toast.Style.Failure;
            toast.title = "Link unavailable";
            toast.message = url
              ? `${title} link looks invalid. Please check the package metadata.`
              : `${title} is not provided for this package.`;
          }
        } catch (error) {
          toast.style = Toast.Style.Failure;
          toast.title = "Unable to open link";
          toast.message = error instanceof Error ? error.message : undefined;
        }
      }}
    />
  );
}

function CategoryDropdown({
  categories,
  onChange,
  value,
}: {
  categories: CategorySummary[];
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <List.Dropdown tooltip="Filter by category" value={value} onChange={onChange} storeValue>
      <List.Dropdown.Item title="All categories" value="all" />
      {categories.map((category: CategorySummary) => (
        <List.Dropdown.Item key={category.id} title={category.title} value={category.title} />
      ))}
    </List.Dropdown>
  );
}

function getEmptyStateTitle({
  errorMessage,
  searchText,
  loadingState,
}: {
  errorMessage?: string;
  searchText: string;
  loadingState: LoadingState;
}): string {
  if (errorMessage) {
    return "Unable to load packages";
  }
  if (loadingState === "initial") {
    return "Loading categories";
  }
  if (!searchText.trim()) {
    return "Start searching";
  }
  return "No packages yet";
}

function getEmptyStateDescription({
  errorMessage,
  searchText,
}: {
  errorMessage?: string;
  searchText: string;
}): string | undefined {
  if (errorMessage) {
    return errorMessage;
  }
  if (!searchText.trim()) {
    return "Type a keyword to search Django packages.";
  }
  return "Try a different keyword or category.";
}
