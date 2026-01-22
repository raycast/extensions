import { List, Icon, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchAllAnalytics } from "./api/client";
import { useState, useEffect, useMemo } from "react";
import { DeviceUsageDetail } from "./components/DeviceUsageDetail";
import { CountriesDetail } from "./components/CountriesDetail";
import { ReferrersDetail } from "./components/ReferrersDetail";
import { PagesDetail } from "./components/PagesDetail";
import { CommonActions } from "./components/CommonActions";
import { AnalyticsSection, DeviceUsageData, TopCountryData, ReferrerData, PageData } from "./types";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const dashboardUrl = preferences.dashboardUrl || "https://app.bklit.com";
  const [selectedSection, setSelectedSection] = useState<AnalyticsSection>("countries");

  // Fetch all endpoints in parallel with a single cached promise
  // This ensures truly parallel execution and single cache management
  const { data, isLoading, error, revalidate } = useCachedPromise(
    async () => {
      const result = await fetchAllAnalytics();

      // Collect errors from individual endpoints
      const errors: string[] = [];
      if (!result.countries.success) errors.push(`Countries: ${result.countries.error}`);
      if (!result.deviceUsage.success) errors.push(`Device: ${result.deviceUsage.error}`);
      if (!result.referrers.success) errors.push(`Referrers: ${result.referrers.error}`);
      if (!result.pages.success) errors.push(`Pages: ${result.pages.error}`);

      // If all failed, throw an error
      if (errors.length === 4) {
        throw new Error(errors[0]);
      }

      return {
        device: result.deviceUsage.data,
        countries: result.countries.data,
        referrers: result.referrers.data,
        pages: result.pages.data,
        partialErrors: errors.length > 0 ? errors : undefined,
      };
    },
    [],
    { initialData: undefined, keepPreviousData: true },
  );

  // Extract data from combined result
  const deviceResult: DeviceUsageData | undefined = data?.device;
  const countriesData: TopCountryData[] | undefined = data?.countries;
  const referrersData: ReferrerData[] | undefined = data?.referrers;
  const pagesData: PageData[] | undefined = data?.pages;

  // Handle errors with toast notifications
  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load analytics",
        message: error.message,
      });
    } else if (data?.partialErrors) {
      // Show warning for partial failures
      showToast({
        style: Toast.Style.Failure,
        title: "Some data failed to load",
        message: data.partialErrors.join(", "),
      });
    }
  }, [error, data?.partialErrors]);

  // Memoize computed values to avoid recalculations
  const hasErrors = useMemo(() => !isLoading && !!error, [isLoading, error]);

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
          description={error?.message || "Unable to load analytics data. Please check your API key and project ID."}
          actions={
            <CommonActions dashboardUrl={dashboardUrl} projectId={preferences.projectId} onRefresh={revalidate} />
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
            <CommonActions dashboardUrl={dashboardUrl} projectId={preferences.projectId} onRefresh={revalidate} />
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
          detail={<CountriesDetail data={countriesData} isLoading={isLoading} />}
          actions={
            <CommonActions dashboardUrl={dashboardUrl} projectId={preferences.projectId} onRefresh={revalidate} />
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
          detail={<DeviceUsageDetail data={deviceResult} isLoading={isLoading} />}
          actions={
            <CommonActions dashboardUrl={dashboardUrl} projectId={preferences.projectId} onRefresh={revalidate} />
          }
        />

        <List.Item
          id="referrers"
          title="Top Referrers"
          icon={Icon.Link}
          accessories={
            referrersData && referrersData.length > 0 ? [{ text: `${referrersData.length} sources` }] : undefined
          }
          detail={<ReferrersDetail data={referrersData} isLoading={isLoading} />}
          actions={
            <CommonActions dashboardUrl={dashboardUrl} projectId={preferences.projectId} onRefresh={revalidate} />
          }
        />

        <List.Item
          id="pages"
          title="Top Pages"
          icon={Icon.Document}
          accessories={pagesData && pagesData.length > 0 ? [{ text: `${pagesData.length} pages` }] : undefined}
          detail={<PagesDetail data={pagesData} isLoading={isLoading} />}
          actions={
            <CommonActions dashboardUrl={dashboardUrl} projectId={preferences.projectId} onRefresh={revalidate} />
          }
        />
      </>
    </List>
  );
}
