import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getNetworks } from "./api/networks";
import ResultItem from "./components/ResultItem";

export default function Command() {
  const { data: networks, isLoading } = useCachedPromise(getNetworks, [], { execute: true });

  return (
    <List isShowingDetail>
      {!isLoading &&
        networks &&
        networks.map((network) => (
          <ResultItem key={network.id} id={network.id} title={network.name} result={network} type={"network"} />
        ))}

      {isLoading && <List.Item title="Loading..." />}

      {!isLoading && !networks && <List.EmptyView title="No networks" description="No networks found" />}
    </List>
  );
}
