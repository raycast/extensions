import { useState } from "react";
import { Action, ActionPanel, LaunchProps, List, useNavigation } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { ApiUrls } from "./constants/center";
import AssetTransferHistory from "./AssetTransferHistory";
import AssetDetail from "./AssetDetail";
import { markdownNFTDetail } from "./utils/markdown";

interface GetContractsOfOwnerArguments {
  address: string;
}

export default function Command(props: LaunchProps<{ arguments: GetContractsOfOwnerArguments }>) {
  const address = props?.arguments.address || "";
  const [searchText, setSearchText] = useState(address || "");

  const { push } = useNavigation();
  const { data } = useFetch(ApiUrls.getContractsOfOwner("ethereum-mainnet", searchText), {
    method: "GET",
    headers: { accept: "application/json", "X-API-Key": "keya5c220403e6b7ac702391824" },
  });

  //  @ts-ignore
  const contracts = data?.contracts;

  return (
    <List
      isShowingDetail
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle="Search Beers"
      searchBarPlaceholder="Search your favorite beer"
    >
      {searchText
        ? contracts?.map((item: any, index: number) => (
            <List.Item
              key={index}
              title={item.name}
              icon={{
                source: item.media?.gateway,
              }}
              detail={<List.Item.Detail markdown={markdownNFTDetail(item.media?.gateway, item.name)} />}
              actions={
                <ActionPanel>
                  <Action
                    title="Go to Details"
                    onAction={() => push(<AssetDetail address={item.address} tokenId={item.tokenID} />)}
                  />
                  <Action
                    title="Transfer History"
                    onAction={() => push(<AssetTransferHistory address={item.address} tokenId={item.tokenID} />)}
                  />
                </ActionPanel>
              }
            />
          ))
        : null}
    </List>
  );
}
