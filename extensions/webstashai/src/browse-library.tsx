import {
  Action,
  ActionPanel,
  Icon,
  List,
  getPreferenceValues,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useCallback, useState } from "react";
import {
  deletePage,
  handleApiError,
  listPages,
  updatePage,
} from "./api/client";
import PageListItem from "./components/PageListItem";
import type { PageListItemActions } from "./components/PageListItem";
import {
  getCacheAgeLabel,
  getInitialPages,
  setCachedPages,
} from "./shared-cache";
import { isValidApiKey } from "./helpers/utils";
import type { Page } from "./types";

type StatusFilter = "" | "indexed" | "processing" | "failed";

export default function BrowseLibraryCommand() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [tagFilter, setTagFilter] = useState("");
  const [domainFilter, setDomainFilter] = useState("");

  const apiKey = getPreferenceValues<{ apiKey: string }>().apiKey;
  if (!isValidApiKey(apiKey)) {
    return <InvalidKeyView />;
  }

  const { data, isLoading, pagination, mutate } = useCachedPromise(
    (status: StatusFilter, tag: string, domain: string) =>
      async (options: { cursor?: string }) => {
        const result = await listPages({
          cursor: options.cursor,
          status: status || undefined,
          tag: tag || undefined,
          domain: domain || undefined,
        });

        // Cache the first page of results for instant load next time
        if (!options.cursor) {
          setCachedPages(result.pages);
        }

        return {
          data: result.pages,
          hasMore: result.has_more,
          cursor: result.next_cursor ?? undefined,
        };
      },
    [statusFilter, tagFilter, domainFilter],
    {
      initialData: getInitialPages(),
      keepPreviousData: true,
      onError: async (error) => {
        const handled = await handleApiError(error);
        if (!handled) {
          await showFailureToast("Failed to load library");
        }
      },
    },
  );

  const cacheLabel = getCacheAgeLabel();

  // ── Optimistic update callbacks for list-level actions ────────
  const listActions: PageListItemActions = {
    onToggleFavorite: useCallback(
      async (pageId: string, newValue: 0 | 1) => {
        await mutate(updatePage(pageId, { is_favorite: newValue }), {
          optimisticUpdate: (pages) =>
            pages?.map((p) =>
              p.id === pageId ? { ...p, is_favorite: newValue } : p,
            ),
        });
      },
      [mutate],
    ),
    onTogglePin: useCallback(
      async (pageId: string, newValue: 0 | 1) => {
        await mutate(updatePage(pageId, { is_pinned: newValue }), {
          optimisticUpdate: (pages) =>
            pages?.map((p) =>
              p.id === pageId ? { ...p, is_pinned: newValue } : p,
            ),
        });
      },
      [mutate],
    ),
    onDelete: useCallback(
      async (pageId: string) => {
        await mutate(deletePage(pageId), {
          optimisticUpdate: (pages) => pages?.filter((p) => p.id !== pageId),
        });
      },
      [mutate],
    ),
  };

  // Extract unique tags and domains from current data for the filter dropdown
  const availableTags = getUniqueTags(data ?? []);
  const availableDomains = getUniqueDomains(data ?? []);

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      searchBarPlaceholder="Filter pages..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter"
          onChange={(value) => {
            if (value.startsWith("status:")) {
              setStatusFilter(value.replace("status:", "") as StatusFilter);
              setTagFilter("");
              setDomainFilter("");
            } else if (value.startsWith("tag:")) {
              setTagFilter(value.replace("tag:", ""));
              setStatusFilter("");
              setDomainFilter("");
            } else if (value.startsWith("domain:")) {
              setDomainFilter(value.replace("domain:", ""));
              setStatusFilter("");
              setTagFilter("");
            } else {
              setStatusFilter("");
              setTagFilter("");
              setDomainFilter("");
            }
          }}
        >
          <List.Dropdown.Item title="All Pages" value="" />
          <List.Dropdown.Section title="Status">
            <List.Dropdown.Item title="Indexed" value="status:indexed" />
            <List.Dropdown.Item title="Processing" value="status:processing" />
            <List.Dropdown.Item title="Failed" value="status:failed" />
          </List.Dropdown.Section>
          {availableDomains.length > 0 && (
            <List.Dropdown.Section title="Domain">
              {availableDomains.map((domain) => (
                <List.Dropdown.Item
                  key={domain}
                  title={domain}
                  value={`domain:${domain}`}
                />
              ))}
            </List.Dropdown.Section>
          )}
          {availableTags.length > 0 && (
            <List.Dropdown.Section title="Tags">
              {availableTags.map((tag) => (
                <List.Dropdown.Item
                  key={tag}
                  title={tag}
                  value={`tag:${tag}`}
                />
              ))}
            </List.Dropdown.Section>
          )}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        title="No Pages Found"
        description={
          statusFilter || tagFilter || domainFilter
            ? "No pages match the current filter"
            : "Your library is empty. Save your first page!"
        }
        icon={Icon.Book}
      />
      {cacheLabel && !isLoading && (
        <List.Section title={cacheLabel}>
          {(data ?? []).map((page) => (
            <PageListItem key={page.id} page={page} actions={listActions} />
          ))}
        </List.Section>
      )}
      {!cacheLabel &&
        (data ?? []).map((page) => (
          <PageListItem key={page.id} page={page} actions={listActions} />
        ))}
    </List>
  );
}

function getUniqueTags(pages: Page[]): string[] {
  const tags = new Set<string>();
  for (const page of pages) {
    if (page.primary_tag) tags.add(page.primary_tag);
  }
  return Array.from(tags).sort();
}

function getUniqueDomains(pages: Page[]): string[] {
  const domains = new Set<string>();
  for (const page of pages) {
    if (page.domain) domains.add(page.domain);
  }
  return Array.from(domains).sort();
}

function InvalidKeyView() {
  return (
    <List>
      <List.EmptyView
        title="Invalid API Key"
        description="Your API key must start with 'wsk_'. Open extension preferences to update it."
        icon={Icon.ExclamationMark}
        actions={
          <ActionPanel>
            <Action
              title="Open Preferences"
              icon={Icon.Gear}
              onAction={async () => {
                const { openExtensionPreferences } =
                  await import("@raycast/api");
                await openExtensionPreferences();
              }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
