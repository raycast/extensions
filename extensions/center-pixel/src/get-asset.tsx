import { LaunchProps } from "@raycast/api";
import AssetDetail from "./AssetDetail";

interface GetAssetViewArguments {
  address: string;
  tokenId: string;
}

// 0x23581767a106ae21c074b2276D25e5C3e136a68b
export default function Command(props: LaunchProps<{ arguments: GetAssetViewArguments }>) {
  const address = props?.arguments.address || "";
  const tokenId = props?.arguments.tokenId || "";

  return <AssetDetail address={address} tokenId={tokenId} />;
}
