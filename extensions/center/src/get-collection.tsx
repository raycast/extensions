import { LaunchProps } from "@raycast/api";
import CollectionDetail from "./CollectionDetail";

export default function Command(props: LaunchProps<{ arguments: Arguments.GetCollection }>) {
  const address = props?.arguments?.address || "";

  return <CollectionDetail address={address} />;
}
