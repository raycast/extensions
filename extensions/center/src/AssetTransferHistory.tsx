import { useState } from "react";
import { List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { ApiUrls, CENTER_API_KEY } from "./constants/center";
import { TransferHistoryResponse } from "./types";

export default function AssetTransferHistory({ address, tokenId }: { address: string; tokenId: string }) {
  const [searchText, setSearchText] = useState(address || "");

  const { data } = useFetch<TransferHistoryResponse>(ApiUrls.getAssetTransfers("ethereum-mainnet", address, tokenId), {
    method: "GET",
    headers: { accept: "application/json", "X-API-Key": CENTER_API_KEY },
  });

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle="Search Beers"
      searchBarPlaceholder="Search your favorite beer"
    >
      {searchText
        ? data?.items?.map((item: TransferHistoryResponse["items"]["0"], index: number) => (
            <List.Item key={index} title={item.blockNumber.toString()} subtitle={`From: ${item.from} To: ${item.to}`} />
          ))
        : null}
    </List>
  );
}
