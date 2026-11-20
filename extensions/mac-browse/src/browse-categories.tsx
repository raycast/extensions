import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { AppItem } from "./app-item";
import { ErrorView } from "./error-view";
import { App, CATEGORIES, CategoryResponse, HEADERS, SITE, absolute } from "./api";

export default function BrowseCategories() {
  return (
    <List searchBarPlaceholder="Filter categories…">
      {Object.entries(CATEGORIES).map(([key, label]) => (
        <List.Item
          key={key}
          title={label}
          icon={Icon.Folder}
          actions={
            <ActionPanel>
              <Action.Push title="Show Apps" icon={Icon.List} target={<CategoryApps category={key} label={label} />} />
              <Action.OpenInBrowser title="Open on Mac Browse" url={absolute(`/${key}`)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function CategoryApps({ category, label }: { category: string; label: string }) {
  const { data, isLoading, pagination, error, revalidate } = useFetch<CategoryResponse, App[], App[]>(
    (options) => `${SITE}/api/search?category=${category}&page=${options.page + 1}`,
    {
      headers: HEADERS,
      mapResult(result: CategoryResponse) {
        return { data: result.items, hasMore: result.page < result.pages };
      },
      keepPreviousData: true,
    },
  );

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      navigationTitle={label}
      searchBarPlaceholder={`Filter ${label} apps…`}
    >
      {error ? <ErrorView error={error} onRetry={revalidate} /> : <List.EmptyView title={`No ${label} apps yet`} />}
      {data?.map((app) => (
        <AppItem key={app.id} app={app} showCategory={false} />
      ))}
    </List>
  );
}
