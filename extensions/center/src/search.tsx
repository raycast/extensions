import { useState } from "react";
import { Action, ActionPanel, Icon, LaunchProps, List, useNavigation } from "@raycast/api";
import AssetTransferHistory from "./AssetTransferHistory";
import AssetDetail from "./AssetDetail";
import { markdownNFTDetail } from "./utils/markdown";
import CollectionDetail from "./CollectionDetail";
import { useSearch } from "./hooks/center";
import { SearchResponse } from "./types";

interface GetContractsOfOwnerArguments {
  query: string;
}
type SearchItem = SearchResponse["results"][0];

const resultTypes = [
  { id: "All", name: "All" },
  { id: "Asset", name: "Assets" },
  { id: "Collection", name: "Collections" },
];

function ResultTypeDropdown(props: {
  resultTypes: typeof resultTypes;
  onResultTypeChange: (newValue: string) => void;
}) {
  const { resultTypes, onResultTypeChange } = props;
  return (
    <List.Dropdown
      tooltip="Select Drink Type"
      storeValue={true}
      onChange={(newValue) => {
        onResultTypeChange(newValue);
      }}
    >
      <List.Dropdown.Section title="Alcoholic Beverages">
        {resultTypes.map((drinkType) => (
          <List.Dropdown.Item key={drinkType.id} title={drinkType.name} value={drinkType.id} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

export default function Command(props: LaunchProps<{ arguments: GetContractsOfOwnerArguments }>) {
  const query = props?.arguments.query || "";
  const [searchText, setSearchText] = useState(query || "");
  const [resultType, setResultType] = useState("all");

  const { push } = useNavigation();
  const { data } = useSearch({ searchText });

  let results = data?.results;

  if (resultType !== "All") {
    results = results?.filter((item: any) => item.type === resultType);
  }

  return (
    <List
      isShowingDetail
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle="Search NFT collections or assets"
      searchBarPlaceholder="Type..."
      filtering={true}
      searchBarAccessory={<ResultTypeDropdown resultTypes={resultTypes} onResultTypeChange={setResultType} />}
    >
      {searchText
        ? results?.map((item: SearchItem, index: number) => (
            <List.Item
              key={index}
              title={item.name}
              subtitle={item.type}
              detail={<List.Item.Detail markdown={markdownNFTDetail(item.previewImageUrl, item.name)} />}
              icon={{
                source: item.previewImageUrl,
              }}
              actions={
                <ActionPanel>
                  <Action
                    title="Go to Details"
                    icon={Icon.ArrowRightCircle}
                    onAction={() => {
                      if (item.type === "Asset") {
                        push(<AssetDetail address={item.address} tokenId={item.tokenId} />);
                      } else if (item.type === "Collection") {
                        push(<CollectionDetail address={item.address} />);
                      }
                    }}
                  />
                  {item.type === "Asset" ? (
                    <Action
                      title="Transfer History"
                      icon={Icon.List}
                      onAction={() =>
                        push(
                          <AssetTransferHistory
                            title={`${item.name} Transfer History`}
                            address={item.address}
                            tokenId={item.tokenId}
                          />
                        )
                      }
                    />
                  ) : null}
                </ActionPanel>
              }
            />
          ))
        : null}
    </List>
  );
}
