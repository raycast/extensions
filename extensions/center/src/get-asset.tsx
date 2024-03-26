import { LaunchProps } from "@raycast/api";
import AssetDetail from "./AssetDetail";

export default function Command(props: LaunchProps<{ arguments: Arguments.GetAsset }>) {
  const address = props?.arguments?.address || "";
  const tokenId = props?.arguments?.tokenId || "";

  return <AssetDetail address={address} tokenId={tokenId} />;
}
