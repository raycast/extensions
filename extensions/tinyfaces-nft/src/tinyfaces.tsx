import { useState } from "react";
import { List, ActionPanel, Action, Image } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { PaginatedData, SearchFilters, TokenData } from "./types";

const API_ENDPOINT = "https://nft-api.tinyfac.es/token";

const SEARCH_TYPES: Record<SearchFilters, string> = {
  TOKEN_ID: "Token ID",
  NAME: "Name",
  ATMOSPHERE: "Atmosphere",
  BODY: "Body",
  COLOR: "Color",
  EYE_COLOR: "Eye Color",
  FACE: "Face",
  GLASSES: "Glasses",
  HAT: "Hat",
  MOUTH: "Mouth",
};

const SEARCH_QUERY_STRING: Record<SearchFilters, string> = {
  TOKEN_ID: "partial_token_id",
  NAME: "partial_name",
  ATMOSPHERE: "partial_atmosphere",
  BODY: "partial_body",
  COLOR: "partial_color",
  EYE_COLOR: "partial_eye_color",
  FACE: "partial_face",
  GLASSES: "partial_glasses",
  HAT: "partial_hat",
  MOUTH: "partial_mouth",
};

export default function Command() {
  const [searchText, setSearchText] = useState<undefined | string>(undefined);
  const [searchType, setSearchFilter] = useState<SearchFilters>("TOKEN_ID");
  const [selectedId, setSelectedId] = useState<undefined | string>(undefined);

  const { isLoading: isLoadingTokenId = false, data: tokenIdData } = useFetch<TokenData>(
    `${API_ENDPOINT}/${searchText}`,
    {
      execute: searchType === "TOKEN_ID" && Boolean(searchText),
    }
  );
  const { isLoading: isLoadingName, data: nameData } = useFetch<PaginatedData>(
    `${API_ENDPOINT}?page=0&limit=100&${SEARCH_QUERY_STRING[searchType]}=${searchText}`,
    {
      execute: searchType !== "TOKEN_ID" && Boolean(searchText),
    }
  );

  let isLoading;
  if (searchType === "TOKEN_ID") {
    isLoading = isLoadingTokenId && Boolean(searchText);
  }
  if (searchType === "NAME") {
    isLoading = isLoadingName && Boolean(searchText);
  }
  return (
    <List
      throttle
      isShowingDetail={Boolean(selectedId)}
      isLoading={isLoading}
      searchBarPlaceholder="Search for token ID, name, or trait"
      searchText={searchText}
      onSearchTextChange={setSearchText}
      onSelectionChange={setSelectedId}
      searchBarAccessory={
        <SearchTypeDropdown
          searchTypes={Object.keys(SEARCH_TYPES) as SearchFilters[]}
          onChange={(searchFilter) => {
            setSearchText("");
            setSearchFilter(searchFilter);
          }}
        />
      }
    >
      {tokenIdData && Boolean(searchText) && (
        <List.Item
          title={tokenIdData.name}
          accessories={[{ text: `#${tokenIdData.token_id}` }]}
          icon={{ source: `${tokenIdData.direct_url}?width=120&height=120`, mask: Image.Mask.Circle }}
          detail={<TokenDetail data={tokenIdData} />}
          actions={<SharedAction data={tokenIdData} />}
        />
      )}
      {nameData?.results &&
        Boolean(searchText) &&
        nameData?.results?.map((token) => (
          <List.Item
            key={token.token_id}
            title={token.name}
            accessories={[{ text: `#${token.token_id}` }]}
            icon={{ source: `${token.direct_url}?width=120&height=120`, mask: Image.Mask.Circle }}
            detail={<TokenDetail data={token} />}
            actions={<SharedAction data={token} />}
          />
        ))}
    </List>
  );
}

function SearchTypeDropdown(props: { searchTypes: SearchFilters[]; onChange: (searchType: SearchFilters) => void }) {
  const { searchTypes, onChange } = props;
  return (
    <List.Dropdown
      tooltip="Select Search Type"
      storeValue={true}
      onChange={(newValue) => onChange(newValue as SearchFilters)}
    >
      <List.Dropdown.Section title="Search Types">
        {searchTypes.map((searchType) => (
          <List.Dropdown.Item key={searchType} title={SEARCH_TYPES[searchType]} value={searchType} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

function TokenDetail({ data }: { data: TokenData }) {
  return (
    <List.Item.Detail
      markdown={`<img src="${data.direct_url}?width=180&height=180"/>`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Token ID" text={`#${data.token_id}`} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Atmosphere"
            text={`${data.atmosphere === "Confetti" ? "🎉" : data.atmosphere}`}
          />
          <List.Item.Detail.Metadata.Label title="Name" text={data.name} />
          <List.Item.Detail.Metadata.Label title="Hat" text={data.hat} />
          <List.Item.Detail.Metadata.Label title="Face" text={data.face} />
          <List.Item.Detail.Metadata.Label title="Glasses" text={data.glasses} />
          <List.Item.Detail.Metadata.Label title="Eye Color" text={data.eye_color} />
          <List.Item.Detail.Metadata.Label title="Mouth" text={data.mouth} />
          <List.Item.Detail.Metadata.Label title="Body" text={data.body} />
          <List.Item.Detail.Metadata.Label title="Birthday" text={String(new Date(data.birthday).toDateString())} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Link title="Open..." text="OpenSea" target={data.opensea_url} />
          <List.Item.Detail.Metadata.Link title="Open..." text="Hi-Res Image" target={data.direct_url} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function SharedAction({ data }: { data: TokenData }) {
  return (
    <ActionPanel>
      <Action.OpenInBrowser title="Open on OpenSea" url={data.opensea_url} />
      <Action.OpenInBrowser title="Open Hi-Res Image" url={data.direct_url} />
      <Action.CopyToClipboard title="Copy Token ID" content={`#${data.token_id}`} />
    </ActionPanel>
  );
}
