import { List, ActionPanel, Action } from "@raycast/api";
import axios from "axios";
import { useEffect, useState } from "react";
import * as analytics from "./utils/analytics";

const STARKSCAN_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36",
};

const formatNumber = (str: string): string => {
  return str.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

type StarknetStat = {
  name: string;
  value: string;
};

export default function Command() {
  const [listLoading, setListLoading] = useState<boolean>(true);
  const [listItems, setListItems] = useState<StarknetStat[]>([]);

  useEffect(() => {
    analytics.trackEvent("OPEN_STARKNET_STATS");
  }, []);

  async function getDailyStatus() {
    try {
      return await axios.get(`https://starkscan.co/_next/data/cIl8kMxjxKVwWM30EMVIZ/stats.json`);
    } catch (err) {
      console.error(err);
      return {
        data: false,
      };
    }
  }

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
        getDailyStatus(),
      ];

      const [latestBlockResponse, overviewStatsResponse, dodStatsResponse] = await Promise.all(promises);

      const latestBlockStats = latestBlockResponse.data.data.latestBlockStats.latest;
      const overviewStats = overviewStatsResponse.data.data.starknetOverviewStats;
      let dodStatsArray: StarknetStat[] = [];
      try {
        const statsDaily = dodStatsResponse.data.pageProps.statsDaily.statsDaily;
        const todayStats = statsDaily[statsDaily.length - 1];
        dodStatsArray = [
          {
            name: "MCPS",
            value: String(todayStats.main_calls_per_second),
          },
          {
            name: "SPS",
            value: String(todayStats.execution_resources_n_steps_per_second),
          },
        ];
      } catch (err) {
        console.error(err);
      }

      setListItems([
        {
          name: "TPS",
          value: String(latestBlockStats.transactions_per_second),
        },
        ...dodStatsArray,
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
            <ActionPanel>
              <Action.OpenInBrowser
                onOpen={() => analytics.trackEvent("STATS_OPEN_STARKSCAN")}
                url="https://starkscan.co/stats"
              />
            </ActionPanel>
          }
          accessories={[{ text: item.value }]}
        />
      ))}
    </List>
  );
}
