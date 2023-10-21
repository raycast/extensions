import { List } from "@raycast/api";
import { Network } from "../Types/types";

export default function EmptyView(props: { network: Network }) {
  if (props.network === Network.Mainnet) {
    return (
      <List.EmptyView
        icon="🔍"
        title={`Search for Mainnet address`}
        description="Enter the desired address in search bar above"
      />
    );
  } else if (props.network === Network.Ghostnet) {
    return (
      <List.EmptyView
        icon="🔍"
        title={`Search for Ghostnet address`}
        description="Enter the desired address in search bar above"
      />
    );
  } else {
    return null;
  }
}