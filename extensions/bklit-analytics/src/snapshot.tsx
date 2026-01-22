import { List, Icon, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchDeviceUsage, fetchTopCountries, fetchTopReferrers, fetchTopPages } from "./api/client";
import { useState, useEffect, useMemo } from "react";
import { DeviceUsageDetail } from "./components/DeviceUsageDetail";
import { CountriesDetail } from "./components/CountriesDetail";
import { ReferrersDetail } from "./components/ReferrersDetail";
import { PagesDetail } from "./components/PagesDetail";
import { CommonActions } from "./components/CommonActions";
import { AnalyticsSection } from "./types";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const dashboardUrl = preferences.dashboardUrl || "https://app.bklit.com";
  const [selectedSection, setSelectedSection] = useState<AnalyticsSection>("countries");

  // Fetch each endpoint separately for progressive updates
  // This allows data to appear as it arrives, rather than waiting for all requests
  const {
    data: deviceResult,
    isLoading: deviceLoading,
    error: deviceError,
    revalidate: revalidateDevice,
  } = useCachedPromise(
    async () => {
      const result = await fetchDeviceUsage();
      if (!result.success) throw new Error(result.error || "Failed to fetch device data");
      return result.data;
    },
    [],
    { initialData: undefined, keepPreviousData: true },
  );

  const {
    data: countriesData,
    isLoading: countriesLoading,
    error: countriesError,
    revalidate: revalidateCountries,
  } = useCachedPromise(
    async () => {
      const result = await fetchTopCountries();
      if (!result.success) throw new Error(result.error || "Failed to fetch countries data");
      return result.data;
    },
    [],
    { initialData: undefined, keepPreviousData: true },
  );

  const {
    data: referrersData,
    isLoading: referrersLoading,
    error: referrersError,
    revalidate: revalidateReferrers,
  } = useCachedPromise(
    async () => {
      const result = await fetchTopReferrers();
      if (!result.success) throw new Error(result.error || "Failed to fetch referrers data");
      return result.data;
    },
    [],
    { initialData: undefined, keepPreviousData: true },
  );

  const {
    data: pagesData,
    isLoading: pagesLoading,
    error: pagesError,
    revalidate: revalidatePages,
  } = useCachedPromise(
    async () => {
      const result = await fetchTopPages();
      if (!result.success) throw new Error(result.error || "Failed to fetch pages data");
      return result.data;
    },
    [],
    { initialData: undefined, keepPreviousData: true },
  );

  const isLoading = deviceLoading || countriesLoading || referrersLoading || pagesLoading;

  // Refresh all data
  const refreshAll = () => {
    revalidateDevice();
    revalidateCountries();
    revalidateReferrers();
    revalidatePages();
  };

  // Handle errors with toast notifications (consolidated)
  // Note: Multiple errors may trigger multiple toasts, which is intentional to show all failures
  useEffect(() => {
    const errors = [
      { error: deviceError, name: "device" },
      { error: countriesError, name: "countries" },
      { error: referrersError, name: "referrers" },
      { error: pagesError, name: "pages" },
    ];

    errors.forEach(({ error, name }) => {
      if (error) {
        showToast({
          style: Toast.Style.Failure,
          title: `Failed to load ${name} data`,
          message: error.message,
        });
      }
    });
  }, [deviceError, countriesError, referrersError, pagesError]);

  // Memoize computed values to avoid recalculations
  const hasErrors = useMemo(
    () => !isLoading && !!(deviceError || countriesError || referrersError || pagesError),
    [isLoading, deviceError, countriesError, referrersError, pagesError],
  );

  const hasValidData = useMemo(
    () =>
      !!(deviceResult && deviceResult.mobile && deviceResult.desktop) ||
      !!(countriesData && countriesData.length > 0) ||
      !!(referrersData && referrersData.length > 0) ||
      !!(pagesData && pagesData.length > 0),
    [deviceResult, countriesData, referrersData, pagesData],
  );

  // Show EmptyView if all data is ready but there's no valid data and there are errors
  if (!hasValidData && hasErrors) {
    return (
      <List isLoading={false}>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Failed to Load Data"
          description={
            deviceError?.message ||
            countriesError?.message ||
            referrersError?.message ||
            pagesError?.message ||
            "Unable to load analytics data. Please check your API key and project ID."
          }
          actions={
            <CommonActions dashboardUrl={dashboardUrl} projectId={preferences.projectId} onRefresh={refreshAll} />
          }
        />
      </List>
    );
  }

  // Show EmptyView if all data is ready but there's no valid data (no errors, just empty)
  // Only show this if we're not currently loading
  if (!isLoading && !hasValidData && !hasErrors) {
    return (
      <List isLoading={false}>
        <List.EmptyView
          icon={Icon.BarChart}
          title="No Data Available"
          description="No analytics data found. Make sure your project has collected some data."
          actions={
            <CommonActions dashboardUrl={dashboardUrl} projectId={preferences.projectId} onRefresh={refreshAll} />
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      selectedItemId={selectedSection}
      onSelectionChange={(id) => setSelectedSection(id as AnalyticsSection)}
    >
      <>
        <List.Item
          id="countries"
          title="Top Countries"
          icon={Icon.Globe}
          accessories={
            countriesData && countriesData.length > 0 ? [{ text: `${countriesData.length} countries` }] : undefined
          }
          detail={<CountriesDetail data={countriesData} isLoading={countriesLoading} />}
          actions={
            <CommonActions dashboardUrl={dashboardUrl} projectId={preferences.projectId} onRefresh={refreshAll} />
          }
        />

        <List.Item
          id="device"
          title="Device Usage"
          icon={Icon.Mobile}
          accessories={
            deviceResult && deviceResult.mobile && deviceResult.desktop
              ? [
                  {
                    text: `${(deviceResult.mobile.percentage ?? 0).toFixed(0)}% / ${(deviceResult.desktop.percentage ?? 0).toFixed(0)}%`,
                  },
                ]
              : undefined
          }
          detail={<DeviceUsageDetail data={deviceResult} isLoading={deviceLoading} />}
          actions={
            <CommonActions dashboardUrl={dashboardUrl} projectId={preferences.projectId} onRefresh={refreshAll} />
          }
        />

        <List.Item
          id="referrers"
          title="Top Referrers"
          icon={Icon.Link}
          accessories={
            referrersData && referrersData.length > 0 ? [{ text: `${referrersData.length} sources` }] : undefined
          }
          detail={<ReferrersDetail data={referrersData} isLoading={referrersLoading} />}
          actions={
            <CommonActions dashboardUrl={dashboardUrl} projectId={preferences.projectId} onRefresh={refreshAll} />
          }
        />

        <List.Item
          id="pages"
          title="Top Pages"
          icon={Icon.Document}
          accessories={pagesData && pagesData.length > 0 ? [{ text: `${pagesData.length} pages` }] : undefined}
          detail={<PagesDetail data={pagesData} isLoading={pagesLoading} />}
          actions={
            <CommonActions dashboardUrl={dashboardUrl} projectId={preferences.projectId} onRefresh={refreshAll} />
          }
        />
      </>
    </List>
  );
}
