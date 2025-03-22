import { LaunchProps } from "@raycast/api";
import CollectionDetail from "./CollectionDetail";
interface GetAssetViewArguments {
  address: string;
  tokenId: string;
}

export default function Command(props: LaunchProps<{ arguments: GetAssetViewArguments }>) {
  const address = props?.arguments.address || "";

  return <CollectionDetail address={address} />;
}
