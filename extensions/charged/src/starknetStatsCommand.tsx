import { List, ActionPanel, Action, Image } from "@raycast/api";
import axios from "axios";
import { useEffect, useState } from "react";

const STARKSCAN_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36",
};

const formatNumber = (str: string): string => {
  return str.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

export default function Command() {
  const [listLoading, setListLoading] = useState<boolean>(true);
  const [listItems, setListItems] = useState<{ name: string; value: string }[]>([]);

  useEffect(() => {
    (async () => {
      const promises = [
        axios.post(
          `https://starkscan.stellate.sh/`,
          {
            query:
              "query HomePageStatsSummaryLatestBlockStatsQuery {\n  latestBlockStats {\n    latest {\n      ...HomePageStatsTPSItemFragment_blockStats\n      ...HomePageStatsFeeItemFragment_blockStats\n    }\n  }\n}\n\nfragment HomePageStatsFeeItemFragment_blockStats on BlockStats {\n  average_transaction_actual_fee_display\n  average_transaction_actual_fee_usd_value\n}\n\nfragment HomePageStatsTPSItemFragment_blockStats on BlockStats {\n  transactions_per_second\n}\n",
            variables: {},
          },
          {
            headers: STARKSCAN_HEADERS,
          }
        ),
        axios.post(
          `https://starkscan.stellate.sh/`,
          {
            query:
              "query HomePageStatsSummaryStarknetOverViewStatsQuery {\n  starknetOverviewStats {\n    ...useHomePageStatsInfoFragment_starknetOverviewStats\n  }\n}\n\nfragment useHomePageStatsInfoFragment_starknetOverviewStats on StarknetOverviewStats {\n  total_count_blocks\n  total_count_transactions\n  total_count_events\n  total_count_messages\n  total_count_contracts\n  total_count_classes\n}\n",
            variables: {},
          },
          {
            headers: STARKSCAN_HEADERS,
          }
        ),
      ];

      const [latestBlockResponse, overviewStatsResponse] = await Promise.all(promises);
      const latestBlockStats = latestBlockResponse.data.data.latestBlockStats.latest;
      const overviewStats = overviewStatsResponse.data.data.starknetOverviewStats;

      console.log("these are latestBlockStats", latestBlockStats);

      setListItems([
        {
          name: "TPS",
          value: String(latestBlockStats.transactions_per_second),
        },
        {
          name: "Average Transaction Fee in USD",
          value: latestBlockStats.average_transaction_actual_fee_usd_value,
        },
        {
          name: "Total Blocks",
          value: formatNumber(overviewStats.total_count_blocks),
        },
        {
          name: "Total Transactions",
          value: formatNumber(overviewStats.total_count_transactions),
        },
        {
          name: "Total Events",
          value: formatNumber(overviewStats.total_count_events),
        },
        {
          name: "Total Messages",
          value: formatNumber(overviewStats.total_count_messages),
        },
        {
          name: "Total Contracts",
          value: formatNumber(overviewStats.total_count_contracts),
        },
        {
          name: "Total Classes",
          value: formatNumber(overviewStats.total_count_classes),
        },
      ]);
      setListLoading(false);
    })();
  }, []);

  return (
    <List isLoading={listLoading} navigationTitle="Fetched from Starkscan">
      {listItems.map((item) => (
        <List.Item
          key={item.name}
          title={item.name}
          actions={
            <ActionPanel title="Open in browser">
              <Action.OpenInBrowser url="https://starkscan.co/stats" />
            </ActionPanel>
          }
          accessories={[{ text: item.value }]}
        />
      ))}
    </List>
  );
}
