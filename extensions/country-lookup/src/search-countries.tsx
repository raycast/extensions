import { Action, ActionPanel, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { showFailureToast, useCachedState, usePromise } from "@raycast/utils";
import { useState } from "react";
import { getCountriesPage, PAGE_SIZE } from "./lib/rest-countries";
import { commonName } from "./lib/format";
import { CountryListItem } from "./components/country-list-item";

export default function SearchCountries() {
  const { entriesWithoutIsoCode } = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");
  const [showingDetail, setShowingDetail] = useCachedState("showing-detail", true);

  const {
    data: countries,
    isLoading,
    pagination,
    revalidate,
  } = usePromise(
    (query: string) =>
      async ({ page }) => {
        const result = await getCountriesPage(query.trim(), page * PAGE_SIZE);
        if (!result.success) throw result.error;
        const data =
          entriesWithoutIsoCode === "hide"
            ? result.countries.filter((country) => country.codes?.alpha_3?.trim())
            : result.countries;
        return { data, hasMore: result.meta.more };
      },
    [searchText],
    {
      onError: (error) => {
        showFailureToast(error, { title: "Could not load countries" });
      },
    },
  );

  async function refresh() {
    getCountriesPage.clearCache();
    const toast = await showToast({ style: Toast.Style.Animated, title: "Refreshing…" });
    await revalidate();
    toast.style = Toast.Style.Success;
    toast.title = "Refreshed";
  }

  return (
    <List
      isLoading={isLoading}
      throttle
      pagination={pagination}
      isShowingDetail={showingDetail}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search countries by name, capital, language…"
    >
      {!isLoading && countries?.length === 0 ? (
        <List.EmptyView
          icon={Icon.Globe}
          title="No countries found"
          description="Try a different search term."
          actions={
            <ActionPanel>
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={refresh} />
            </ActionPanel>
          }
        />
      ) : (
        countries?.map((country) => (
          <CountryListItem
            key={[country.codes?.ccn3, country.codes?.alpha_3, country.codes?.alpha_2, commonName(country)]
              .map((value) => value?.trim())
              .find(Boolean)}
            country={country}
            showingDetail={showingDetail}
            onToggleDetail={() => setShowingDetail((prev) => !prev)}
            onRefresh={refresh}
          />
        ))
      )}
    </List>
  );
}
