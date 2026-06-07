import {
  Action,
  ActionPanel,
  Icon,
  List,
  openExtensionPreferences,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";

import { searchCompanies } from "./api";
import { CompanyListItem } from "./components/CompanyListItem";
import { PAGE_SIZE } from "./constants";

export default function SearchCompanies() {
  const [searchText, setSearchText] = useState("");

  const { isLoading, data, pagination, error } = useCachedPromise(
    (query: string) => async (options: { page: number }) => {
      if (!query.trim()) return { data: [], hasMore: false };
      const startIndex = options.page * PAGE_SIZE;
      const res = await searchCompanies(query.trim(), startIndex);
      const items = res.items ?? [];
      const total = res.total_results ?? items.length;
      return { data: items, hasMore: startIndex + items.length < total };
    },
    [searchText],
    { keepPreviousData: true },
  );

  return (
    <List
      isLoading={isLoading}
      throttle
      pagination={pagination}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search companies by name or number…"
    >
      {data?.length ? (
        data.map((item) => (
          <CompanyListItem key={item.company_number} item={item} />
        ))
      ) : error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Couldn't load companies"
          description={error.message}
          actions={
            <ActionPanel>
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      ) : searchText ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No companies found"
          description="Try a different name or number."
        />
      ) : (
        <List.EmptyView
          icon={Icon.Building}
          title="Search Companies House"
          description="Start typing a company name or number."
        />
      )}
    </List>
  );
}
