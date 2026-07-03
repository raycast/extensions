import { Action, ActionPanel, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { showFailureToast, useCachedState, usePromise } from "@raycast/utils";
import { useMemo } from "react";
import { getAllCountries } from "./lib/rest-countries";
import { commonName } from "./lib/format";
import { CountryListItem } from "./components/country-list-item";

export default function SearchCountries() {
  const { entriesWithoutIsoCode } = getPreferenceValues<Preferences>();
  const [showingDetail, setShowingDetail] = useCachedState("showing-detail", true);

  const {
    data: countries,
    isLoading,
    revalidate,
  } = usePromise(
    async () => {
      const result = await getAllCountries();
      if (!result.success) throw result.error;
      return entriesWithoutIsoCode === "hide"
        ? result.countries.filter((country) => country.codes?.alpha_3?.trim())
        : result.countries;
    },
    [],
    {
      onError: (error) => {
        showFailureToast(error, { title: "Could not load countries" });
      },
    },
  );

  // Maps an ISO 3166-1 alpha-3 code to a country's common name so the detail
  // view can show border countries by name (e.g. "IRN" → "Iran").
  const namesByCode = useMemo(() => {
    const map = new Map<string, string>();
    for (const country of countries ?? []) {
      const code = country.codes?.alpha_3?.trim();
      if (code) map.set(code, commonName(country));
    }
    return map;
  }, [countries]);

  async function refresh() {
    getAllCountries.clearCache();
    const toast = await showToast({ style: Toast.Style.Animated, title: "Refreshing…" });
    await revalidate();
    toast.style = Toast.Style.Success;
    toast.title = "Refreshed";
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showingDetail}
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
            namesByCode={namesByCode}
            onToggleDetail={() => setShowingDetail((prev) => !prev)}
            onRefresh={refresh}
          />
        ))
      )}
    </List>
  );
}
