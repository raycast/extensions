import { useState } from "react";
import { List, useNavigation } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { ApiUrls } from "./constants/center";

type Data = {
  items: {
    address: string; // Collection Address
    blockNumber: number; // Block Number
    from: string; // From Address
    logIndex: number; // Log Index
    network: string; // Network ID
    to: string; // Collection Address
    tokenId: string; // Token Id
  }[];
};

export default function AssetTransferHistory({ address, tokenId }: { address: string; tokenId: string }) {
  const [searchText, setSearchText] = useState(address || "");

  const { push } = useNavigation();
  const { data } = useFetch<Data>(ApiUrls.getAssetTransfers("ethereum-mainnet", address, tokenId), {
    method: "GET",
    headers: { accept: "application/json", "X-API-Key": "keya5c220403e6b7ac702391824" },
  });

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle="Search Beers"
      searchBarPlaceholder="Search your favorite beer"
    >
      {searchText
        ? data?.items?.map((item, index: number) => (
            <List.Item key={index} title={item.blockNumber.toString()} subtitle={`From: ${item.from} To: ${item.to}`} />
          ))
        : null}
    </List>
  );
}
