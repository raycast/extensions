import axios from "axios";
import { showToast, Toast } from "@raycast/api";
import { DefichainStats } from "../models/defichainStats";

export const getStats = async () => {
  return axios
    .get("https://ocean.defichain.com/v0/mainnet/stats")
    .then((response) => {
      const stats = response.data.data;
      const frozen5yrData =
        stats.masternodes.locked
          .filter((x: { weeks: number }) => x.weeks === 260)
          .map((x: { count: number }) => x.count) ?? 0;
      const frozen10yrData =
        stats.masternodes.locked
          .filter((x: { weeks: number }) => x.weeks === 520)
          .map((x: { count: number }) => x.count) ?? 0;

      return {
        blockHeight: stats.count.blocks as number,
        dfiPrice: stats.price.usd as number,
        amountAuctions: stats.loan.count.openAuctions as number,
        amountVaults: stats.loan.count.openVaults as number,
        masternode: {
          total: stats.count.masternodes as number,
          frozen5yr: frozen5yrData,
          frozen10yr: frozen10yrData,
        },
      };
    })
    .catch((error) => {
      showToast({
        style: Toast.Style.Failure,
        title: "Ocean API not available",
        message: "please try again later...",
      });
      return null;
    });
};
