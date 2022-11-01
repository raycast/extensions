import { List } from "@raycast/api";
import { Cluster, clusterApiUrl, Connection } from "@solana/web3.js";
import { useMemo, useState } from "react";
import { useDebounce } from "use-debounce";
import AccountDetailView from "../AccountDetailView";
import TransactionDetailView from "../TransactionDetailView";

interface Props {
  cluster: Cluster;
}

const Command = ({ cluster }: Props) => {
  const [query, setQuery] = useState<string>();
  const [debouncedQuery] = useDebounce(query, 200);

  const connection = useMemo(() => {
    return new Connection(clusterApiUrl(cluster));
  }, []);

  if (debouncedQuery?.trim().length === 44) {
    return <AccountDetailView pubkey={debouncedQuery.trim()} connection={connection} />;
  }

  if (debouncedQuery?.trim().length === 88) {
    return <TransactionDetailView signature={debouncedQuery.trim()} connection={connection} />;
  }

  return (
    <List searchBarPlaceholder="Search by address or transaction signature" onSearchTextChange={setQuery} throttle>
      <List.EmptyView title="Type a account address or transaction signature" />
    </List>
  );
};

export default Command;
