import { LaunchProps } from "@raycast/api";
import CollectionDetail from "./CollectionDetail";
interface GetAssetViewArguments {
  address: string;
  tokenId: string;
}

// 0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D
export default function Command(props: LaunchProps<{ arguments: GetAssetViewArguments }>) {
  const address = props?.arguments.address || "";

  return <CollectionDetail address={address} />;
}
