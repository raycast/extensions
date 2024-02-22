import { useState } from "react";
import { Action, ActionPanel, Icon, LaunchProps, List, getPreferenceValues, useNavigation } from "@raycast/api";
import AssetTransferHistory from "./AssetTransferHistory";
import AssetDetail from "./AssetDetail";
import { markdownNFTDetail } from "./utils/markdown";
import { useContractsOfOwner } from "./hooks/center";
import { UseContractsOfOwnersResponse } from "./types";

interface GetContractsOfOwnerArguments {
  address: string;
}
type ContractItem = UseContractsOfOwnersResponse["contracts"]["0"];

export default function Command(props: LaunchProps<{ arguments: GetContractsOfOwnerArguments }>) {
  const address = props?.arguments.address || "";
  const [searchText, setSearchText] = useState(address || "");

  const { push } = useNavigation();
  const { data } = useContractsOfOwner({ searchText });
  const contracts = data?.contracts;

  return (
    <List
      isShowingDetail
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle="Get Contracts of Owner"
      searchBarPlaceholder="Type ENS or Address"
    >
      {searchText
        ? contracts?.map((item: ContractItem, index: number) => (
            <List.Item
              key={index}
              title={item.name}
              icon={
                item.media?.gateway
                  ? {
                      source: item.media?.gateway,
                    }
                  : Icon.Image
              }
              detail={<List.Item.Detail markdown={markdownNFTDetail(item.media?.gateway, item.name)} />}
              actions={
                <ActionPanel>
                  <Action
                    title="Go to Details"
                    icon={Icon.ArrowRightCircle}
                    onAction={() => push(<AssetDetail address={item.address} tokenId={item.tokenID} />)}
                  />
                  <Action
                    title="Transfer History"
                    icon={Icon.List}
                    onAction={() =>
                      push(
                        <AssetTransferHistory
                          title={`${item.name} Transfer History`}
                          address={item.address}
                          tokenId={item.tokenID}
                        />
                      )
                    }
                  />
                  <Action
                    title="Visit Center"
                    icon={Icon.Globe}
                    onAction={() =>
                      push(
                        <AssetTransferHistory
                          title={`${item.name} Transfer History`}
                          address={item.address}
                          tokenId={item.tokenID}
                        />
                      )
                    }
                  />
                </ActionPanel>
              }
            />
          ))
        : null}
    </List>
  );
}
