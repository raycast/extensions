import { useState } from "react";
import { List } from "@raycast/api";
import { TransferHistoryResponse } from "./types";
import { useTransferHistory } from "./hooks/center";

export default function AssetTransferHistory({
  address,
  tokenId,
  title,
}: {
  address: string;
  tokenId: string;
  title: string;
}) {
  const [searchText, setSearchText] = useState(title);
  const { data } = useTransferHistory({
    address,
    tokenId,
  });

  return (
    <List searchText={searchText} onSearchTextChange={setSearchText}>
      {searchText
        ? data?.items?.map((item: TransferHistoryResponse["items"]["0"], index: number) => (
            <List.Item key={index} title={item.blockNumber.toString()} subtitle={`From: ${item.from} To: ${item.to}`} />
          ))
        : null}
    </List>
  );
}
