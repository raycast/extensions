import { ActionPanel, Action, Icon, List, LocalStorage } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect, useState } from "react";
import { mapsSearchUrl } from "./maps-url";

interface PostOffice {
  Name: string;
  BranchType: string;
  DeliveryStatus: string;
  Circle: string;
  District: string;
  Division: string;
  Region: string;
  State: string;
  Country: string;
  Pincode: string;
}

interface ApiResponse {
  Status: string;
  Message: string;
  PostOffice: PostOffice[] | null;
}

function formatAllDetails(po: PostOffice): string {
  return [
    `Name: ${po.Name}`,
    `PIN Code: ${po.Pincode}`,
    `Branch Type: ${po.BranchType}`,
    `Delivery: ${po.DeliveryStatus}`,
    `District: ${po.District}`,
    `State: ${po.State}`,
    `Circle: ${po.Circle}`,
    `Division: ${po.Division}`,
    `Region: ${po.Region}`,
  ].join("\n");
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    LocalStorage.getItem<string>("recentPincode").then((val) => {
      if (val) {
        try {
          setRecentSearches(JSON.parse(val));
        } catch {
          // ignore corrupted cache
        }
      }
    });
  }, []);

  const query = searchText.trim();
  const isPureDigits = query.length > 0 && /^\d+$/.test(query);
  const isReadyPinMode = isPureDigits && query.length === 6;
  const isReadyAreaMode = !isPureDigits && query.length >= 3;
  const shouldFetch = isReadyPinMode || isReadyAreaMode;

  // Always construct a URL so the hook call is unconditional; execute:false guards actual requests
  const fetchUrl = isPureDigits
    ? `https://api.postalpincode.in/pincode/${query}`
    : `https://api.postalpincode.in/postoffice/${encodeURIComponent(query || "placeholder")}`;

  const { data, isLoading, error } = useFetch<PostOffice[]>(fetchUrl, {
    execute: shouldFetch,
    keepPreviousData: false,
    parseResponse: async (res) => {
      if (!res.ok) throw new Error("API error");
      const json: ApiResponse[] = await res.json();
      const result = json[0];
      if (result.Status !== "Success" || !result.PostOffice?.length) {
        throw new Error("No post offices found");
      }
      return result.PostOffice;
    },
    onError: () => {}, // error state handled via empty view
  });

  useEffect(() => {
    if (data && data.length > 0 && shouldFetch) {
      setRecentSearches((prev) => {
        const next = [query, ...prev.filter((q) => q !== query)].slice(0, 5);
        LocalStorage.setItem("recentPincode", JSON.stringify(next));
        return next;
      });
    }
  }, [data, query]);

  // Derive display state
  const partialDigits = isPureDigits && query.length > 0 && query.length < 6;
  const tooLongPin = isPureDigits && query.length > 6;
  const shortAreaQuery = !isPureDigits && query.length > 0 && query.length < 3;
  const showRecents = !query && recentSearches.length > 0;
  const showWelcome = !query && recentSearches.length === 0;
  const showResults = shouldFetch && !!data && data.length > 0;
  const showNotFound = shouldFetch && !isLoading && !!error;

  const sectionTitle = isReadyPinMode
    ? `PIN ${query} · ${data?.length ?? 0} post office${data?.length === 1 ? "" : "s"}`
    : `Areas matching "${query}" · ${data?.length ?? 0} result${data?.length === 1 ? "" : "s"}`;

  return (
    <List
      isLoading={shouldFetch && isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
      throttle
      searchBarPlaceholder="Type a 6-digit PIN or area name (e.g. Connaught)"
    >
      {showWelcome && (
        <List.EmptyView
          title="Look up any Indian PIN code"
          description="Type a 6-digit PIN code or 3+ letters of an area name"
          icon={Icon.Pin}
        />
      )}
      {partialDigits && (
        <List.EmptyView
          title={`Keep typing — ${6 - query.length} more digit${6 - query.length === 1 ? "" : "s"} needed`}
          icon={Icon.Pin}
        />
      )}
      {tooLongPin && <List.EmptyView title="PIN codes are exactly 6 digits" icon={Icon.ExclamationMark} />}
      {shortAreaQuery && <List.EmptyView title="Type at least 3 letters" icon={Icon.MagnifyingGlass} />}
      {showNotFound && <List.EmptyView title={`No post offices found for "${query}"`} icon={Icon.Warning} />}

      {showRecents && (
        <List.Section title="Recent Searches">
          {recentSearches.map((q) => (
            <List.Item
              key={q}
              title={q}
              icon={Icon.MagnifyingGlass}
              actions={
                <ActionPanel>
                  <Action title="Search Again" onAction={() => setSearchText(q)} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {showResults && (
        <List.Section title={sectionTitle}>
          {data!.map((po, i) => {
            const subtitle = isReadyPinMode ? `${po.BranchType}, ${po.DeliveryStatus}` : `${po.District}, ${po.State}`;
            const accessories: List.Item.Accessory[] = isReadyPinMode
              ? [{ text: po.District }, { text: po.State }]
              : [{ text: po.Pincode }, { text: po.BranchType }];
            const addressLine = `${po.Name}, ${po.District}, ${po.State} - ${po.Pincode}`;
            const mapsUrl = mapsSearchUrl(`${po.Name}, ${po.District}, ${po.State}`);

            return (
              <List.Item
                key={`${po.Name}-${po.Pincode}-${i}`}
                icon={Icon.Pin}
                title={po.Name}
                subtitle={subtitle}
                accessories={accessories}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard title="Copy PIN Code" content={po.Pincode} />
                    <Action.CopyToClipboard title="Copy Address" content={addressLine} />
                    <Action.CopyToClipboard title="Copy All Details" content={formatAllDetails(po)} />
                    <Action.Open title="Open in Maps" target={mapsUrl} icon={Icon.Map} />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
