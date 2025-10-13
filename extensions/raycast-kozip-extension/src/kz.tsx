import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { useFetch, useLocalStorage } from "@raycast/utils";
import { useState, useEffect } from "react";

type UiStrings = {
  searchPlaceholder: string;
  resultsTitle: string;
  copyKoreanAddress: string;
  copyEnglishAddress: string;
  copyKoreanLotAddress: string;
  copyEnglishLotAddress: string;
  openInKakaoMap: string;
  openInNaverMap: string;
  copyAddressSection: string;
  mapSection: string;
  noAddressInfo: string;
  switchToJibun: string;
  switchToRoad: string;
  roadAddressType: string;
  jibunAddressType: string;
};

const UI_STRINGS: UiStrings = {
  searchPlaceholder: "Search addresses...",
  resultsTitle: "Results",
  copyKoreanAddress: "Copy Korean Address",
  copyEnglishAddress: "Copy English Address",
  copyKoreanLotAddress: "Copy Korean Jibun Address",
  copyEnglishLotAddress: "Copy English Jibun Address",
  openInKakaoMap: "Open in Kakao Map",
  openInNaverMap: "Open in Naver Map",
  copyAddressSection: "Copy Address",
  mapSection: "Map",
  noAddressInfo: "No address info",
  switchToJibun: "Switch to Jibun Address",
  switchToRoad: "Switch to Road Address",
  roadAddressType: "Road",
  jibunAddressType: "Jibun",
};

// API Response interfaces
interface ApiResult {
  postcode5: string;
  postcode6: string;
  ko_common: string;
  ko_doro: string;
  ko_jibeon: string;
  en_common: string;
  en_doro: string;
  en_jibeon: string;
  building_name?: string;
}

interface ApiResponse {
  error?: string;
  count: number;
  results: ApiResult[];
}

// Cache interface
interface CacheEntry {
  data: AddressResult[];
  timestamp: number;
  expiresAt: number;
}

// Cache duration: 24 hours
const CACHE_DURATION = 24 * 60 * 60 * 1000;

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState("");
  const [showJibunAddress, setShowJibunAddress] = useState(false);
  const [cachedData, setCachedData] = useState<AddressResult[] | null>(null);
  const strings = UI_STRINGS;

  const { value: cache, setValue: setCache } = useLocalStorage<Record<string, CacheEntry>>("address-cache", {});

  // Debounce search text
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchText]);

  // Check cache first
  useEffect(() => {
    if (debouncedSearchText.length === 0) {
      setCachedData(null);
      return;
    }

    const cacheKey = debouncedSearchText.normalize("NFC").toLowerCase();
    const cachedEntry = cache?.[cacheKey];

    if (cachedEntry && cachedEntry.expiresAt > Date.now()) {
      setCachedData(cachedEntry.data);
      return;
    }

    setCachedData(null);
  }, [debouncedSearchText, cache]);

  const shouldFetch = debouncedSearchText.length > 0 && cachedData === null;

  const { data: fetchedData, isLoading } = useFetch<AddressResult[]>(
    `https://api.poesis.kr/post/search.php?q=${encodeURIComponent(debouncedSearchText.normalize("NFC"))}`,
    {
      parseResponse: parseFetchResponse,
      execute: shouldFetch,
      onData: (data: AddressResult[]) => {
        // Save to cache
        const cacheKey = debouncedSearchText.normalize("NFC").toLowerCase();
        const cacheEntry: CacheEntry = {
          data,
          timestamp: Date.now(),
          expiresAt: Date.now() + CACHE_DURATION,
        };

        setCache({
          ...cache,
          [cacheKey]: cacheEntry,
        });
      },
    },
  );

  const data: AddressResult[] = cachedData || fetchedData || [];

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={strings.searchPlaceholder}
      throttle
    >
      <List.Section title={strings.resultsTitle} subtitle={data?.length + ""}>
        {data?.map((searchResult: AddressResult) => (
          <SearchListItem
            key={searchResult.id}
            searchResult={searchResult}
            strings={strings}
            showJibunAddress={showJibunAddress}
            onToggleAddressType={() => setShowJibunAddress(!showJibunAddress)}
          />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({
  searchResult,
  strings,
  showJibunAddress,
  onToggleAddressType,
}: {
  searchResult: AddressResult;
  strings: UiStrings;
  showJibunAddress: boolean;
  onToggleAddressType: () => void;
}) {
  return (
    <List.Item
      title={`${searchResult.postcode5} ${
        showJibunAddress
          ? searchResult.full_ko_jibeon || strings.noAddressInfo
          : searchResult.full_ko_doro || strings.noAddressInfo
      }`}
      subtitle={showJibunAddress ? searchResult.full_en_jibeon : searchResult.full_en_doro}
      actions={
        <ActionPanel>
          <ActionPanel.Section title={strings.copyAddressSection}>
            <Action.CopyToClipboard
              title={showJibunAddress ? strings.copyKoreanLotAddress : strings.copyKoreanAddress}
              content={
                showJibunAddress ? searchResult.full_ko_jibeon_with_postal : searchResult.full_ko_doro_with_postal
              }
            />
            <Action.CopyToClipboard
              title={showJibunAddress ? strings.copyEnglishLotAddress : strings.copyEnglishAddress}
              content={
                showJibunAddress ? searchResult.full_en_jibeon_with_postal : searchResult.full_en_doro_with_postal
              }
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title={showJibunAddress ? strings.switchToRoad : strings.switchToJibun}
              onAction={onToggleAddressType}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
              icon={Icon.Switch}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title={strings.mapSection}>
            <Action.OpenInBrowser
              title={strings.openInKakaoMap}
              url={`https://map.kakao.com/link/search/${encodeURIComponent(showJibunAddress ? searchResult.full_ko_jibeon : searchResult.full_ko_doro)}`}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
            <Action.OpenInBrowser
              title={strings.openInNaverMap}
              url={`https://map.naver.com/v5/search/${encodeURIComponent(showJibunAddress ? searchResult.full_ko_jibeon : searchResult.full_ko_doro)}`}
              shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

async function parseFetchResponse(response: Response): Promise<AddressResult[]> {
  const json = (await response.json()) as ApiResponse | { error: string };

  if (!response.ok || json.error) {
    throw new Error(json.error || response.statusText);
  }

  return (json as ApiResponse).results.map((result: ApiResult, index: number) => {
    const buildingName = result.building_name ? ` (${result.building_name})` : "";
    return {
      id: `${result.postcode5}-${index}`,
      postcode5: result.postcode5,
      postcode6: result.postcode6,
      ko_doro: result.ko_doro,
      ko_jibeon: result.ko_jibeon,
      en_doro: result.en_doro,
      en_jibeon: result.en_jibeon,
      full_ko_doro: `${result.ko_common} ${result.ko_doro}${buildingName}`,
      full_ko_jibeon: `${result.ko_common} ${result.ko_jibeon}${buildingName}`,
      full_en_doro: `${result.en_doro}, ${result.en_common}`,
      full_en_jibeon: `${result.en_jibeon}, ${result.en_common}`,
      full_ko_doro_with_postal: `(${result.postcode5}) ${result.ko_common} ${result.ko_doro}${buildingName}`,
      full_ko_jibeon_with_postal: `(${result.postcode5}) ${result.ko_common} ${result.ko_jibeon}${buildingName}`,
      full_en_doro_with_postal: `${result.en_doro}, ${result.en_common} (${result.postcode5})`,
      full_en_jibeon_with_postal: `${result.en_jibeon}, ${result.en_common} (${result.postcode5})`,
      building_name: result.building_name,
    } as AddressResult;
  });
}

interface AddressResult {
  id: string;
  postcode5: string;
  postcode6: string;
  ko_doro: string;
  ko_jibeon: string;
  en_doro: string;
  en_jibeon: string;
  full_ko_doro: string;
  full_ko_jibeon: string;
  full_en_doro: string;
  full_en_jibeon: string;
  full_ko_doro_with_postal: string;
  full_ko_jibeon_with_postal: string;
  full_en_doro_with_postal: string;
  full_en_jibeon_with_postal: string;
  building_name?: string;
}
