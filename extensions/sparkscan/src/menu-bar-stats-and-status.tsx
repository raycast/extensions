import { Clipboard, getPreferenceValues, Icon, MenuBarExtra, open, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";

import type { GetNetworkStatsV1StatsSummaryGetQuery } from "@sparkscan/api-types";
import { useEffect, useState } from "react";

import { BASE_HEADERS, OPENSTATUS_STATUS_API_URL } from "./lib/constants";
import type { Preferences } from "./lib/preferences";
import { addRaycastUTM } from "./lib/url";
import { capitalize } from "./lib/utils";

enum OpenStatusStatus {
  Operational = "operational",
  DegradedPerformance = "degraded_performance",
  PartialOutage = "partial_outage",
  MajorOutage = "major_outage",
  UnderMaintenance = "under_maintenance", // currently not in use
  Unknown = "unknown",
  Incident = "incident",
}

interface OpenStatusResponse {
  status: OpenStatusStatus;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();

  const [isLoading, setIsLoading] = useState(true);

  const { data: openStatusData, isLoading: isOpenStatusLoading } =
    useFetch<OpenStatusResponse>(OPENSTATUS_STATUS_API_URL);

  const { data: sparkscanData, isLoading: isSparkscanLoading } = useFetch(
    `https://api.sparkscan.io/v1/stats/summary?${new URLSearchParams({ network: preferences.defaultNetwork.toUpperCase() })}`,
    {
      headers: {
        ...BASE_HEADERS,
      },
      mapResult(res: GetNetworkStatsV1StatsSummaryGetQuery["Response"]) {
        if ("detail" in res) {
          console.error("Failed to fetch statistics", res.detail);
          throw new Error("Failed to fetch statistics");
        }
        const data = res as GetNetworkStatsV1StatsSummaryGetQuery["Response"];

        return {
          data,
        };
      },
    },
  );

  useEffect(() => {
    setIsLoading(isOpenStatusLoading || isSparkscanLoading);
  }, [isOpenStatusLoading, isSparkscanLoading]);

  return (
    <MenuBarExtra icon={{ source: "extension-icon.png" }} isLoading={isLoading}>
      <MenuBarExtra.Item
        icon={Icon.Network}
        title={capitalize(openStatusData?.status || OpenStatusStatus.Unknown)}
        subtitle="Sparkscan Status"
        onAction={() => open(addRaycastUTM("https://status.sparkscan.io", "status-menu-bar"))}
      />
      <MenuBarExtra.Section title="Stats">
        <CopyItemWithToast
          icon={Icon.Coin}
          title={`$${sparkscanData?.totalValueLockedUsd.toLocaleString()}`}
          subtitle="Total Value Locked"
        />
        <CopyItemWithToast
          icon={Icon.Person}
          title={`${sparkscanData?.activeAccounts.toLocaleString()}`}
          subtitle="Active Accounts"
        />
        <CopyItemWithToast
          icon={Icon.ArrowsExpand}
          title={`${sparkscanData?.transactions24h.toLocaleString()}`}
          subtitle="Transactions (24h)"
        />
        <CopyItemWithToast
          icon={Icon.Coins}
          title={`$${sparkscanData?.currentBtcPriceUsd.toLocaleString()}`}
          subtitle="Current BTC Price"
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

const CopyItemWithToast = (props: React.ComponentProps<typeof MenuBarExtra.Item>) => (
  <MenuBarExtra.Item
    {...props}
    onAction={() => {
      Clipboard.copy(props.title);
      showToast({
        title: `Copied ${props.subtitle} to clipboard`,
        message: props.title,
        style: Toast.Style.Success,
      });
    }}
  />
);
