import {
  List,
  Icon,
  Color,
  ActionPanel,
  Action,
  openExtensionPreferences,
  getPreferenceValues,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchDeviceUsage, fetchTopCountries, fetchTopReferrers, fetchTopPages } from "./api/client";
import { formatNumberLong } from "./utils/formatters";
import { getCountryFlag } from "./utils/country-flags";
import type { Preferences } from "./types";
import { useState, useEffect } from "react";

type AnalyticsSection = "countries" | "device" | "referrers" | "pages";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const dashboardUrl = preferences.dashboardUrl || "https://app.bklit.com";
  const [selectedSection, setSelectedSection] = useState<AnalyticsSection>("countries");

  // Fetch all data
  const {
    data: deviceData,
    isLoading: deviceLoading,
    error: deviceError,
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
  } = useCachedPromise(
    async () => {
      const result = await fetchTopPages();
      if (!result.success) throw new Error(result.error || "Failed to fetch pages data");
      return result.data;
    },
    [],
    { initialData: undefined, keepPreviousData: true },
  );

  // Handle errors with toast notifications
  useEffect(() => {
    if (deviceError) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load device data",
        message: deviceError.message,
      });
    }
  }, [deviceError]);

  useEffect(() => {
    if (countriesError) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load countries data",
        message: countriesError.message,
      });
    }
  }, [countriesError]);

  useEffect(() => {
    if (referrersError) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load referrers data",
        message: referrersError.message,
      });
    }
  }, [referrersError]);

  useEffect(() => {
    if (pagesError) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load pages data",
        message: pagesError.message,
      });
    }
  }, [pagesError]);

  const isLoading =
    (selectedSection === "device" && deviceLoading) ||
    (selectedSection === "countries" && countriesLoading) ||
    (selectedSection === "referrers" && referrersLoading) ||
    (selectedSection === "pages" && pagesLoading);

  // Brand chart colors
  const CHART_COLORS = {
    primary: "#d2f98b",
    secondary: "#35d5c5",
    third: "#0ea2ff",
    fourth: "#543dd8",
    fifth: "#ef88ff",
  };

  // Generate QuickChart bar chart URL
  const generateBarChartUrl = (labels: string[], values: number[]): string => {
    const colors = [
      CHART_COLORS.primary,
      CHART_COLORS.secondary,
      CHART_COLORS.third,
      CHART_COLORS.fourth,
      CHART_COLORS.fifth,
    ];

    const chartConfig = {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Views",
            data: values,
            backgroundColor: labels.map((_, i) => colors[i % colors.length]),
            borderRadius: 4,
          },
        ],
      },
      options: {
        indexAxis: "y",
        plugins: {
          legend: { display: false },
          title: { display: false },
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: { color: "#fff" },
            grid: { color: "rgba(255,255,255,0.1)" },
          },
          y: {
            ticks: { color: "#fff" },
            grid: { display: false },
          },
        },
      },
    };

    const encoded = encodeURIComponent(JSON.stringify(chartConfig));
    return `https://quickchart.io/chart?c=${encoded}&width=540&height=270&backgroundColor=rgb(30,30,30)&devicePixelRatio=2`;
  };

  // Generate QuickChart pie/doughnut chart URL
  const generatePieChartUrl = (labels: string[], values: number[]): string => {
    const chartConfig = {
      type: "doughnut",
      data: {
        labels: labels,
        datasets: [
          {
            data: values,
            backgroundColor: [CHART_COLORS.primary, CHART_COLORS.secondary],
            borderWidth: 0,
          },
        ],
      },
      options: {
        plugins: {
          legend: {
            display: true,
            position: "bottom",
            labels: {
              color: "#fff",
              font: { size: 14 },
              padding: 15,
            },
          },
          datalabels: {
            color: "#1e1e1e",
            font: { size: 18, weight: "bold" },
            formatter: (value: number, context: { dataset: { data: number[] } }) => {
              const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return `${percentage}%`;
            },
          },
        },
      },
    };

    const encoded = encodeURIComponent(JSON.stringify(chartConfig));
    return `https://quickchart.io/chart?c=${encoded}&width=450&height=315&backgroundColor=rgb(30,30,30)&devicePixelRatio=2`;
  };

  // Render Device Usage detail
  const renderDeviceDetail = () => {
    if (deviceLoading) {
      return <List.Item.Detail markdown="Loading device data..." />;
    }

    if (!deviceData) {
      return <List.Item.Detail markdown="No device data available" />;
    }

    const deviceChartUrl = generatePieChartUrl(
      ["Mobile", "Desktop"],
      [deviceData.mobile.views, deviceData.desktop.views],
    );

    const mobileHigher = deviceData.mobile.views > deviceData.desktop.views;

    return (
      <List.Item.Detail
        markdown={`<img src="${deviceChartUrl}" alt="Device Distribution" height="180" />`}
        metadata={
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.TagList title="Mobile">
              <List.Item.Detail.Metadata.TagList.Item
                key="mobile-icon"
                color={mobileHigher ? Color.Green : Color.Red}
                icon={Icon.Eye}
                text={`${formatNumberLong(deviceData.mobile.views)} views`}
              />
              <List.Item.Detail.Metadata.TagList.Item
                key="mobile-stats"
                text={`${deviceData.mobile.percentage.toFixed(1)}%`}
                color={mobileHigher ? Color.Green : Color.Red}
              />
            </List.Item.Detail.Metadata.TagList>
            <List.Item.Detail.Metadata.TagList title="Desktop">
              <List.Item.Detail.Metadata.TagList.Item
                key="desktop-icon"
                color={mobileHigher ? Color.Red : Color.Green}
                icon={Icon.Eye}
                text={`${formatNumberLong(deviceData.desktop.views)} views`}
              />
              <List.Item.Detail.Metadata.TagList.Item
                key="desktop-stats"
                text={`${deviceData.desktop.percentage.toFixed(1)}%`}
                color={mobileHigher ? Color.Red : Color.Green}
              />
            </List.Item.Detail.Metadata.TagList>
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.TagList title="Total">
              <List.Item.Detail.Metadata.TagList.Item
                key="total-views"
                text={`${formatNumberLong(deviceData.total)} views`}
                icon={Icon.Eye}
                color={undefined}
              />
            </List.Item.Detail.Metadata.TagList>
          </List.Item.Detail.Metadata>
        }
      />
    );
  };

  // Render Countries detail
  const renderCountriesDetail = () => {
    if (countriesLoading) {
      return <List.Item.Detail markdown="Loading countries data..." />;
    }

    if (!countriesData || countriesData.length === 0) {
      return <List.Item.Detail markdown="No countries data available" />;
    }

    const countryChartUrl = generateBarChartUrl(
      countriesData.map((c) => c.country),
      countriesData.map((c) => c.views),
    );

    return (
      <List.Item.Detail
        markdown={`<img src="${countryChartUrl}" alt="Top Countries" height="180" />`}
        metadata={
          <List.Item.Detail.Metadata>
            {countriesData.map((country, index) => (
              <List.Item.Detail.Metadata.TagList key={country.countryCode} title={`${index + 1} → ${country.country}`}>
                <List.Item.Detail.Metadata.TagList.Item
                  key={`${country.countryCode}-flag`}
                  color={index === 0 ? Color.Green : undefined}
                  icon={getCountryFlag(country.countryCode)}
                />
                <List.Item.Detail.Metadata.TagList.Item
                  key={`${country.countryCode}-visitors`}
                  text={`${formatNumberLong(country.uniqueVisitors)} visitors`}
                  color={index === 0 ? Color.Green : undefined}
                />
              </List.Item.Detail.Metadata.TagList>
            ))}
          </List.Item.Detail.Metadata>
        }
      />
    );
  };

  // Render Referrers detail
  const renderReferrersDetail = () => {
    if (referrersLoading) {
      return <List.Item.Detail markdown="Loading referrers data..." />;
    }

    if (!referrersData || referrersData.length === 0) {
      return <List.Item.Detail markdown="No referrers data available" />;
    }

    const referrerChartUrl = generateBarChartUrl(
      referrersData.map((r) => r.referrer),
      referrersData.map((r) => r.views),
    );

    return (
      <List.Item.Detail
        markdown={`<img src="${referrerChartUrl}" alt="Top Referrers" height="180" />`}
        metadata={
          <List.Item.Detail.Metadata>
            {referrersData.map((referrer, index) => (
              <List.Item.Detail.Metadata.TagList key={referrer.referrer} title={`${index + 1} ∙ ${referrer.referrer}`}>
                <List.Item.Detail.Metadata.TagList.Item
                  key={`${referrer.referrer}-views`}
                  text={formatNumberLong(referrer.views)}
                  color={index === 0 ? Color.Green : undefined}
                />
                <List.Item.Detail.Metadata.TagList.Item
                  key={`${referrer.referrer}-percentage`}
                  text={`${referrer.percentage.toFixed(1)}%`}
                  color={index === 0 ? Color.Green : undefined}
                />
              </List.Item.Detail.Metadata.TagList>
            ))}
          </List.Item.Detail.Metadata>
        }
      />
    );
  };

  // Render Pages detail
  const renderPagesDetail = () => {
    if (pagesLoading) {
      return <List.Item.Detail markdown="Loading pages data..." />;
    }

    if (!pagesData || pagesData.length === 0) {
      return <List.Item.Detail markdown="No pages data available" />;
    }

    const pagesChartUrl = generateBarChartUrl(
      pagesData.map((p) => p.path),
      pagesData.map((p) => p.views),
    );

    return (
      <List.Item.Detail
        markdown={`<img src="${pagesChartUrl}" alt="Top Pages" height="180" />`}
        metadata={
          <List.Item.Detail.Metadata>
            {pagesData.map((page, index) => (
              <List.Item.Detail.Metadata.TagList key={page.path} title={`${index + 1} ∙ ${page.path}`}>
                <List.Item.Detail.Metadata.TagList.Item
                  key={`${page.path}-views`}
                  text={formatNumberLong(page.views)}
                  color={index === 0 ? Color.Green : undefined}
                />
                <List.Item.Detail.Metadata.TagList.Item
                  key={`${page.path}-label`}
                  text="views"
                  color={index === 0 ? Color.Green : undefined}
                />
              </List.Item.Detail.Metadata.TagList>
            ))}
          </List.Item.Detail.Metadata>
        }
      />
    );
  };

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      selectedItemId={selectedSection}
      onSelectionChange={(id) => setSelectedSection(id as AnalyticsSection)}
    >
      <List.Item
        id="countries"
        title="Top Countries"
        icon={Icon.Globe}
        accessories={countriesData ? [{ text: `${countriesData.length} countries` }] : undefined}
        detail={renderCountriesDetail()}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open Dashboard" url={`${dashboardUrl}/projects/${preferences.projectId}`} />
            <Action title="Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />

      <List.Item
        id="device"
        title="Device Usage"
        icon={Icon.Mobile}
        accessories={
          deviceData
            ? [{ text: `${deviceData.mobile.percentage.toFixed(0)}% / ${deviceData.desktop.percentage.toFixed(0)}%` }]
            : undefined
        }
        detail={renderDeviceDetail()}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open Dashboard" url={`${dashboardUrl}/projects/${preferences.projectId}`} />
            <Action title="Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />

      <List.Item
        id="referrers"
        title="Top Referrers"
        icon={Icon.Link}
        accessories={referrersData ? [{ text: `${referrersData.length} sources` }] : undefined}
        detail={renderReferrersDetail()}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open Dashboard" url={`${dashboardUrl}/projects/${preferences.projectId}`} />
            <Action title="Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />

      <List.Item
        id="pages"
        title="Top Pages"
        icon={Icon.Document}
        accessories={pagesData ? [{ text: `${pagesData.length} pages` }] : undefined}
        detail={renderPagesDetail()}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open Dashboard" url={`${dashboardUrl}/projects/${preferences.projectId}`} />
            <Action title="Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    </List>
  );
}
