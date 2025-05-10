import { LaunchProps } from "@raycast/api";
import CoinDetail from "./coin-detail";

const BITCOIN_CMC_ID = "1";

export default function BTCDetail(props: LaunchProps<{ arguments: { coinId: string } }>) {
  return <CoinDetail {...props} arguments={{ coinId: BITCOIN_CMC_ID }} />;
}