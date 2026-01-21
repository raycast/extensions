import {
  Icon,
  MenuBarExtra,
  open,
  openExtensionPreferences,
  getPreferenceValues,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect } from "react";
import { fetchTopCountries } from "./api/client";
import { getCountryFlag } from "./utils/country-flags";
import { formatNumber, formatNumberLong } from "./utils/formatters";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const dashboardUrl = preferences.dashboardUrl || "https://app.bklit.com";

  // Fetch countries data with total pageviews
  const { data, isLoading, error, revalidate } = useCachedPromise(
    async () => {
      const result = await fetchTopCountries();
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch data");
      }
      return result;
    },
    [],
    {
      initialData: undefined,
      keepPreviousData: true,
    },
  );

  // Show toast notification for errors
  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load analytics",
        message: error.message || "Network error",
      });
    }
  }, [error]);

  // Use totalPageviews from API response
  const totalViews = data?.totalPageviews || 0;

  // Menu bar title - don't show "Loading..." if we have cached data
  const menuBarTitle = error
    ? "Error"
    : totalViews > 0
      ? formatNumber(totalViews)
      : isLoading
        ? "Loading..."
        : "No data";

  const menuBarIcon = { source: "menubar-icon.png" };

  return (
    <MenuBarExtra
      icon={menuBarIcon}
      title={menuBarTitle}
      isLoading={isLoading && !data}
      tooltip="Bklit Analytics - Last 24 hours"
    >
      {error ? (
        <>
          <MenuBarExtra.Item title="Failed to load analytics" icon={Icon.ExclamationMark} />
          <MenuBarExtra.Item title={error.message || "Unknown error"} icon={Icon.Warning} />
          <MenuBarExtra.Separator />
          <MenuBarExtra.Item title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          <MenuBarExtra.Item title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
        </>
      ) : data?.data && data.data.length > 0 ? (
        <>
          <MenuBarExtra.Section title={`Top 5 Countries (${formatNumberLong(totalViews)} total pageviews)`}>
            {data.data.map((country) => (
              <MenuBarExtra.Item
                key={country.countryCode}
                icon={getCountryFlag(country.countryCode)}
                title={`${country.country} •`}
                subtitle={`${formatNumberLong(country.views)} pageviews • ${formatNumberLong(country.uniqueVisitors)} visitors`}
              />
            ))}
          </MenuBarExtra.Section>

          <MenuBarExtra.Separator />
          <MenuBarExtra.Item
            title="Open Bklit Dashboard"
            onAction={() => open(`${dashboardUrl}/projects/${preferences.projectId}`)}
          />
          <MenuBarExtra.Section>
            <MenuBarExtra.Item
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={revalidate}
            />
            <MenuBarExtra.Item
              title="Preferences"
              icon={Icon.Gear}
              shortcut={{ modifiers: ["cmd"], key: "," }}
              onAction={openExtensionPreferences}
            />
          </MenuBarExtra.Section>
        </>
      ) : (
        <>
          <MenuBarExtra.Item title="No data available" icon={Icon.Info} />
          <MenuBarExtra.Separator />
          <MenuBarExtra.Item title="Open Dashboard" icon={menuBarIcon} onAction={() => open(dashboardUrl)} />
          <MenuBarExtra.Item title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
        </>
      )}
    </MenuBarExtra>
  );
}
