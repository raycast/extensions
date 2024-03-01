import { useEffect, useState } from "react";
import { Action, ActionPanel, Icon, LaunchProps, List, useNavigation } from "@raycast/api";
import AssetTransferHistory from "./AssetTransferHistory";
import AssetDetail from "./AssetDetail";
import { markdownNFTDetail } from "./utils/markdown";
import { getAssetDetails, useContractsOfOwner } from "./hooks/center";
import { ContractsOfOwnersResponse } from "./types";
import { getTokenType } from "./utils/assets";

type ContractItem = ContractsOfOwnersResponse["items"]["0"];

export default function Command(props: LaunchProps<{ arguments: Arguments.GetContractsOfOwner }>) {
  const address = props?.arguments?.address || "";
  const [searchText, setSearchText] = useState(address);
  const { push } = useNavigation();
  const { data, isLoading } = useContractsOfOwner(address);

  const [contracts, setContracts] = useState<ContractItem[]>(data?.items || []);

  useEffect(() => {
    const fetchAndAppendImages = async () => {
      const updatedContracts = await Promise.all(
        contracts.map(async (contract) => {
          const { address, tokenID } = contract;
          const { data: assetDetailsData } = await getAssetDetails({ address, tokenId: tokenID });
          return { ...contract, image: assetDetailsData?.smallPreviewImageUrl || "" };
        }),
      );
      setContracts(updatedContracts);
    };

    fetchAndAppendImages();
  }, []);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle="Get Contracts of Owner"
      searchBarPlaceholder="Type ENS or Address"
    >
      {contracts?.map((item: ContractItem, index: number) => (
        <List.Item
          key={index}
          title={item.collection.name || item.address}
          subtitle={getTokenType(item.contractType)}
          icon={
            item?.image
              ? {
                  source: item?.image,
                }
              : Icon.Image
          }
          detail={
            <List.Item.Detail
              markdown={markdownNFTDetail(item?.image || Icon.Image, item.collection.name || item.address)}
            />
          }
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
                      title={`${item.collection.name} Transfer History`}
                      address={item.address}
                      tokenId={item.tokenID}
                    />,
                  )
                }
              />
              <Action
                title="Visit Center"
                icon={Icon.Globe}
                onAction={() =>
                  push(
                    <AssetTransferHistory
                      title={`${item.collection.name} Transfer History`}
                      address={item.address}
                      tokenId={item.tokenID}
                    />,
                  )
                }
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
