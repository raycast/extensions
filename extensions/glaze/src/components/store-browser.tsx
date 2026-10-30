import { GlazeAction } from "./glaze-action";
import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState, type ReactNode } from "react";
import { searchStoreApps } from "../lib/store";
import { StoreSignInRequired } from "../lib/store-auth";
import {
  STORE_CATEGORIES,
  STORE_SORTS,
  type StoreSort,
} from "../lib/store-filters";
import { openStorePage } from "../lib/deeplinks";
import { getStoreInstalledApps } from "../lib/apps";
import { StoreAppDetail } from "./store-app-detail";

export function StoreBrowser({
  storeId,
  storeName,
  accountActions,
  onRefresh,
  onSignInRequired,
}: {
  storeId: string;
  storeName: string;
  accountActions?: ReactNode;
  onRefresh?: () => Promise<unknown>;
  onSignInRequired?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState<StoreSort>("popular");
  const {
    data: installedApps,
    isLoading: isCheckingInstalledApps,
    error: installationError,
    revalidate: refreshInstalledApps,
  } = usePromise(getStoreInstalledApps);
  const installedStoreIds = new Set(
    installationError ? [] : installedApps?.map((app) => app.storeAppId),
  );
  const filterKey = JSON.stringify([query, category, storeId, sort]);
  // No disk cache: private results belong only to the current signed-in session.
  const {
    data: apps,
    isLoading,
    pagination,
    revalidate,
    error,
  } = usePromise(
    (
      search: string,
      selectedCategory: string,
      selectedStore: string,
      selectedSort: StoreSort,
    ) =>
      async ({ page }: { page: number }) => {
        const result = await searchStoreApps(
          search,
          selectedCategory,
          selectedStore,
          selectedSort,
          page,
        );
        return {
          ...result,
          data: result.data.map((app) => ({
            app,
            filterKey: JSON.stringify([
              search,
              selectedCategory,
              selectedStore,
              selectedSort,
            ]),
          })),
        };
      },
    [query, category, storeId, sort],
    {
      onError(error) {
        if (error instanceof StoreSignInRequired) onSignInRequired?.();
      },
    },
  );

  function browseActions() {
    return (
      <>
        <ActionPanel.Section title="Browse">
          <ActionPanel.Submenu title="Sort Apps" icon={Icon.ArrowDown}>
            {STORE_SORTS.map((item) => (
              <GlazeAction
                key={item.value}
                title={item.title}
                icon={sort === item.value ? Icon.Checkmark : undefined}
                onAction={() => setSort(item.value)}
              />
            ))}
          </ActionPanel.Submenu>
          <GlazeAction
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={async () => {
              await Promise.all([
                revalidate(),
                refreshInstalledApps(),
                onRefresh?.(),
              ]);
            }}
          />
        </ActionPanel.Section>
        {accountActions}
      </>
    );
  }

  return (
    <List
      navigationTitle={`Browse ${storeName} Store`}
      isLoading={isLoading || isCheckingInstalledApps}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder={`Search ${storeName} Store…`}
      throttle
      filtering={false}
      pagination={pagination}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Category"
          placeholder="Search categories…"
          value={category}
          onChange={setCategory}
        >
          {STORE_CATEGORIES.map((item) => (
            <List.Dropdown.Item
              key={item.value}
              title={item.title}
              value={item.value}
              icon={item.icon}
            />
          ))}
        </List.Dropdown>
      }
      actions={<ActionPanel>{browseActions()}</ActionPanel>}
    >
      <List.EmptyView
        title={error ? "Couldn't Load Apps" : "No Apps Found"}
        description={error ? error.message : "Try another search or category."}
        actions={
          <ActionPanel>
            {error && (
              <GlazeAction
                title="Try Again"
                onAction={async () => {
                  await revalidate();
                }}
              />
            )}
            {browseActions()}
          </ActionPanel>
        }
      />
      <List.Section
        title={storeId === "public" ? "Public Apps" : `${storeName} Apps`}
        subtitle={
          STORE_CATEGORIES.find((item) => item.value === category)?.title
        }
      >
        {/* Never leave old private results visible after an access failure. */}
        {!error &&
          apps
            ?.filter((item) => item.filterKey === filterKey)
            .map(({ app }) => (
              <List.Item
                key={app.id}
                title={app.display_name}
                subtitle={app.description ?? undefined}
                icon={app.icon_url || "extension-icon.png"}
                accessories={[
                  ...(installedStoreIds.has(app.id)
                    ? [
                        {
                          icon: {
                            source: Icon.CheckCircle,
                            tintColor: Color.Green,
                          },
                          tooltip: "Installed",
                        },
                      ]
                    : []),
                  {
                    text:
                      app.profiles?.display_name ||
                      app.profiles?.username ||
                      "",
                  },
                ]}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="View Details"
                      target={<StoreAppDetail app={app} />}
                    />
                    <GlazeAction
                      title="Open in Glaze"
                      onAction={() => openStorePage(app.id)}
                    />
                    {browseActions()}
                  </ActionPanel>
                }
              />
            ))}
      </List.Section>
    </List>
  );
}
