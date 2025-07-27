import { useState } from "react";
import { getStatsSummary } from "./utils/markdownUtil";
import { showFailureToast, useFetch } from "@raycast/utils";
import { Result } from "./models/result";

export function useStats() {
  const [statsSummaryMarkdown, setStatsSummaryMarkdown] = useState("### loading stats...");

  const { isLoading } = useFetch("https://ocean.defichain.com/v0/mainnet/stats", {
    mapResult(result: Result) {
      const stats = result.data;
      const frozen5yrData =
        stats.masternodes.locked
          .filter((x: { weeks: number }) => x.weeks === 260)
          .map((x: { count: number }) => x.count) ?? 0;
      const frozen10yrData =
        stats.masternodes.locked
          .filter((x: { weeks: number }) => x.weeks === 520)
          .map((x: { count: number }) => x.count) ?? 0;

      const data = {
        blockHeight: stats.count.blocks,
        dfiPrice: stats.price.usd,
        amountAuctions: stats.loan.count.openAuctions,
        amountVaults: stats.loan.count.openVaults,
        masternode: {
          total: stats.count.masternodes,
          frozen5yr: frozen5yrData,
          frozen10yr: frozen10yrData,
        },
        difficulty: (stats.blockchain.difficulty / 10 ** 9).toFixed(2),
      };

      setStatsSummaryMarkdown(getStatsSummary(data));
      return {
        data,
      };
    },
    onError() {
      setStatsSummaryMarkdown(`### Ocean API not available right now...
Try again later`);
      showFailureToast({
        title: "Ocean API not available",
        message: "please try again later...",
      });
    },
  });

  return { isLoading, statsSummaryMarkdown };
}
