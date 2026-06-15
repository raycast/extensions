import { ActionPanel, Action, Icon, List, LocalStorage } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect, useState } from "react";
import { mapsSearchUrl } from "./maps-url";

const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

interface IFSCData {
  BANK: string;
  BRANCH: string;
  ADDRESS: string;
  CITY: string;
  DISTRICT: string;
  STATE: string;
  CENTRE: string;
  CONTACT: string;
  MICR: string;
  IFSC: string;
  SWIFT: string;
}

type FieldDef = { key: keyof IFSCData; label: string; icon: Icon };

const FIELDS: FieldDef[] = [
  { key: "BANK", label: "Bank", icon: Icon.Building },
  { key: "BRANCH", label: "Branch", icon: Icon.Store },
  { key: "IFSC", label: "IFSC", icon: Icon.Key },
  { key: "MICR", label: "MICR", icon: Icon.Hashtag },
  { key: "ADDRESS", label: "Address", icon: Icon.Map },
  { key: "CITY", label: "City", icon: Icon.Map },
  { key: "DISTRICT", label: "District", icon: Icon.Map },
  { key: "STATE", label: "State", icon: Icon.Map },
  { key: "CENTRE", label: "Centre", icon: Icon.Map },
  { key: "CONTACT", label: "Contact", icon: Icon.Phone },
  { key: "SWIFT", label: "SWIFT", icon: Icon.Globe },
];

function formatAllAsText(data: IFSCData): string {
  return FIELDS.flatMap(({ key, label }) => {
    const val = data[key];
    return val ? [`${label}: ${val}`] : [];
  }).join("\n");
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [recentLookups, setRecentLookups] = useState<string[]>([]);

  useEffect(() => {
    LocalStorage.getItem<string>("recentIFSC").then((val) => {
      if (val) {
        try {
          setRecentLookups(JSON.parse(val));
        } catch {
          // ignore corrupted cache
        }
      }
    });
  }, []);

  const ifsc = searchText.trim().toUpperCase();
  const isValidFormat = IFSC_REGEX.test(ifsc);

  const { data, isLoading, error } = useFetch<IFSCData>(`https://ifsc.razorpay.com/${ifsc}`, {
    execute: isValidFormat,
    keepPreviousData: false,
    parseResponse: async (res) => {
      if (!res.ok) throw new Error("IFSC not found");
      return res.json();
    },
    onError: () => {}, // suppress default failure toast; error state handled via empty view
  });

  useEffect(() => {
    if (data && isValidFormat) {
      setRecentLookups((prev) => {
        const next = [ifsc, ...prev.filter((c) => c !== ifsc)].slice(0, 5);
        LocalStorage.setItem("recentIFSC", JSON.stringify(next));
        return next;
      });
    }
  }, [data, ifsc]);

  const allText = data ? formatAllAsText(data) : "";
  const showWelcome = !searchText.trim() && recentLookups.length === 0;
  const showRecents = !searchText.trim() && recentLookups.length > 0;
  const showInvalidFormat = !!searchText.trim() && !isValidFormat;
  const showNotFound = isValidFormat && !isLoading && !!error;
  const showResults = isValidFormat && !!data;

  return (
    <List
      isLoading={isValidFormat && isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
      throttle
      searchBarPlaceholder="Enter IFSC code (e.g. HDFC0001234)"
    >
      {showWelcome && (
        <List.EmptyView
          title="Look up any Indian bank branch"
          description="Enter an 11-character IFSC code to get started"
          icon={Icon.Building}
        />
      )}
      {showInvalidFormat && (
        <List.EmptyView
          title="Invalid IFSC format"
          description="4 letters + 0 + 6 alphanumerics, e.g. HDFC0001234"
          icon={Icon.ExclamationMark}
        />
      )}
      {showNotFound && (
        <List.EmptyView
          title="IFSC not found"
          description={`"${ifsc}" is not a recognised IFSC code`}
          icon={Icon.Warning}
        />
      )}

      {showRecents && (
        <List.Section title="Recent Lookups">
          {recentLookups.map((code) => (
            <List.Item
              key={code}
              title={code}
              icon={Icon.Clock}
              actions={
                <ActionPanel>
                  <Action title="Look up" onAction={() => setSearchText(code)} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {showResults &&
        FIELDS.flatMap(({ key, label, icon }) => {
          const val = data![key];
          if (!val) return [];

          const mapsUrl = key === "ADDRESS" ? mapsSearchUrl(val) : null;

          return (
            <List.Item
              key={key}
              icon={icon}
              title={label}
              subtitle={val}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Value" content={val} />
                  {mapsUrl && <Action.Open title="Open in Maps" target={mapsUrl} icon={Icon.Map} />}
                  <Action.CopyToClipboard
                    title="Copy All as Text"
                    content={allText}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
}
