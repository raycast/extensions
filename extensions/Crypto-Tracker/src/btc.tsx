import { LaunchProps } from "@raycast/api";
import CoinDetail from "./coin-detail";

// This is just a wrapper that forces the coinId parameter to be "1" (Bitcoin's ID in CoinMarketCap)
export default function BTCDetail(props: LaunchProps) {
  return <CoinDetail {...props} arguments={{ coinId: "1" }} />;
}
