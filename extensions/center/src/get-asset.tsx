import { LaunchProps } from "@raycast/api";
import AssetDetail from "./AssetDetail";

interface GetAssetViewArguments {
  address: string;
  tokenId: string;
}

export default function Command(props: LaunchProps<{ arguments: GetAssetViewArguments }>) {
  const address = props?.arguments.address || "";
  const tokenId = props?.arguments.tokenId || "";

  return <AssetDetail address={address} tokenId={tokenId} />;
}
