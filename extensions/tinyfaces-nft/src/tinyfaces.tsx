import { useState, useEffect } from "react";
import { List, ActionPanel, Action, Image, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { OwnerData, PaginatedData, SearchFilters, SearchQueryStrings, TokenData } from "./types";
import { getDefaultProvider } from "ethers";
import { WagmiConfig, createClient, useEnsAddress } from "wagmi";

const client = createClient({
  autoConnect: true,
  provider: getDefaultProvider(),
});

const isValidEthAddress = (address: string) => /^0x[a-fA-F0-9]{40}$/.test(address);

const API_ENDPOINT = "https://nft-api.tinyfac.es";

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
  OWNER: "Owner",
};

const SEARCH_QUERY_STRINGS: Record<SearchQueryStrings, string> = {
  NAME: "name",
  ATMOSPHERE: "partial_atmosphere",
  BODY: "partial_body",
  COLOR: "partial_color",
  EYE_COLOR: "partial_eye_color",
  FACE: "partial_face",
  GLASSES: "partial_glasses",
  HAT: "partial_hat",
  MOUTH: "partial_mouth",
};

const SEARCH_PLACEHOLDERS: Record<SearchFilters, string> = {
  TOKEN_ID: 'Eg: "34", "596", "2064", "3999"',
  NAME: 'Eg: "Lisa", "Joe", "Yasmin", "Callum"',
  ATMOSPHERE: 'Eg: "Confetti"',
  BODY: 'Eg: "Army", "Apron", "Sailor", "Clown"',
  COLOR: 'Eg: "Lemon Basil", "Ceramic", "Candy Ocean"',
  EYE_COLOR: 'Eg: "Brown", "Blue", "Green", "Grey"',
  FACE: 'Eg: "Drew", "Jordan", "Alex", "Taylor"',
  GLASSES: 'Eg: "Modern", "Square", "Rectangle", "Mega"',
  HAT: 'Eg: "Beanie", "Bear", "Cap", "Jazz", "Bell Boy"',
  MOUTH: 'Eg: "Bubblegum", "Face Mask", "Mustache"',
  OWNER: 'Eg: "ped.eth", "0x1d1A1...cB751"',
};

export default function Command() {
  return (
    <WagmiConfig client={client}>
      <Tiny />
    </WagmiConfig>
  );
}

export function Tiny() {
  const [searchText, setSearchText] = useState<undefined | string>(undefined);
  const [searchType, setSearchFilter] = useState<SearchFilters>("TOKEN_ID");
  const [ensAddress, setEnsAddress] = useState<undefined | string>(undefined);
  const [lookupENSAddress, setLookupENSAddress] = useState<boolean>(false);

  const { isLoading: isLoadingEnsAddress } = useEnsAddress({
    name: searchText,
    enabled: lookupENSAddress,
    onSuccess: (address) => address && setEnsAddress(address),
  });

  const isSearchingByQueryString = searchType !== "TOKEN_ID" && searchType !== "OWNER";

  const { isLoading: isLoadingTokenId = false, data: tokenIdData } = useFetch<TokenData>(
    `${API_ENDPOINT}/token/${searchText}`,
    {
      execute: searchType === "TOKEN_ID" && Boolean(searchText),
    }
  );
  const { isLoading: isLoadingName, data: nameData } = useFetch<PaginatedData>(
    `${API_ENDPOINT}/token?page=0&limit=100&${
      isSearchingByQueryString && SEARCH_QUERY_STRINGS[searchType]
    }=${searchText}`,
    {
      execute: isSearchingByQueryString && Boolean(searchText),
    }
  );
  const { isLoading: isLoadingOwner, data: ownerData } = useFetch<OwnerData>(`${API_ENDPOINT}/address/${ensAddress}`, {
    execute: searchType === "OWNER" && Boolean(ensAddress),
  });

  useEffect(() => {
    if (searchType === "OWNER" && searchText) {
      if (searchText?.includes(".eth")) setLookupENSAddress(true);
      if (isValidEthAddress(searchText)) setEnsAddress(searchText);
    }
  }, [searchText, searchType]);

  let isLoading;

  if (searchType === "TOKEN_ID") {
    isLoading = isLoadingTokenId && Boolean(searchText);
  }
  if (searchType === "NAME") {
    isLoading = isLoadingName && Boolean(searchText);
  }
  if (searchType === "OWNER") {
    isLoading = isLoadingEnsAddress || (isLoadingOwner && Boolean(ensAddress));
  }

  return (
    <List
      throttle
      isShowingDetail
      isLoading={isLoading}
      searchBarPlaceholder={SEARCH_PLACEHOLDERS[searchType]}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <SearchTypeDropdown
          searchTypes={Object.keys(SEARCH_TYPES) as SearchQueryStrings[]}
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
          icon={{
            source: `${tokenIdData.direct_url}?width=120&height=120`,
            mask: Image.Mask.Circle,
            fallback: Icon.PersonCircle,
          }}
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
            icon={{
              source: `${token.direct_url}?width=120&height=120`,
              mask: Image.Mask.Circle,
              fallback: Icon.PersonCircle,
            }}
            detail={<TokenDetail data={token} />}
            actions={<SharedAction data={token} />}
          />
        ))}
      {ownerData?.tokens &&
        Boolean(searchText) &&
        ownerData?.tokens?.map((token) => (
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

function SearchTypeDropdown(props: {
  searchTypes: SearchQueryStrings[];
  onChange: (searchType: SearchQueryStrings) => void;
}) {
  const { searchTypes, onChange } = props;
  return (
    <List.Dropdown
      tooltip="Select Search Type"
      storeValue={true}
      onChange={(newValue) => onChange(newValue as SearchQueryStrings)}
    >
      {searchTypes.map((searchType) => (
        <List.Dropdown.Item key={searchType} title={SEARCH_TYPES[searchType]} value={searchType} />
      ))}
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
          <List.Item.Detail.Metadata.Label title="Color" text={data.color} />
          <List.Item.Detail.Metadata.Separator />
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
      <Action.CopyToClipboard title="Copy Color" content={`#${data.color}`} />
    </ActionPanel>
  );
}
