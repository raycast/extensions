import { ActionPanel, Action, useNavigation, List, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";

import { headers } from "./util";

type IPData = {
  ip: string;
  network: string;
  version: string;
  city: string;
  region: string;
  region_code: string;
  country: string;
  country_name: string;
  country_code: string;
  country_code_iso3: string;
  country_capital: string;
  country_tld: string;
  continent_code: string;
  in_eu: boolean;
  postal: string;
  latitude: number;
  longitude: number;
  timezone: string;
  utc_offset: string;
  country_calling_code: string;
  currency: string;
  currency_name: string;
  languages: string;
  country_area: number;
  country_population: number;
  asn: string;
  org: string;
};

const showItems: Partial<Record<keyof IPData, string>> = {
  ip: "IP Address",
  network: "Network",
  version: "IP Version",
  city: "City",
  region: "Region",
  region_code: "Region Code",
  country: "Country",
  country_name: "Country",
  country_code: "Country Code",
  postal: "Postal Code",
  in_eu: "European Union",
  latitude: "Latitude",
  longitude: "Longitude",
  timezone: "Time Zone",
  utc_offset: "UTC Offset",
  country_calling_code: "Calling Code",
  currency: "Currency",
  languages: "Languages",
  country_area: "Country Area",
  country_population: "Population",
  asn: "ASN",
  org: "Org",
};

export default function LookUp({ ip }: { ip: string }) {
  const { pop } = useNavigation();

  const { isLoading, data, revalidate } = useFetch<IPData>(`https://ipapi.co/${ip}/json/`, {
    headers,
    keepPreviousData: true,
  });

  return (
    <List
      isLoading={isLoading}
      navigationTitle="IP Lookup"
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            url={"https://ipapi.co"}
            onOpen={() => {
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      {Object.keys(data || {}).map((key) => {
        const keyName = key as keyof IPData;
        return (
          Object.prototype.hasOwnProperty.call(showItems, key) && (
            <List.Item
              key={key}
              title={showItems[keyName]!}
              accessories={[{ text: data && data[keyName] ? data[keyName].toString() : "" }]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title={`Copy ${showItems[keyName]}`}
                    content={data && data[keyName] ? data[keyName].toString() : ""}
                  />
                  <Action.OpenInBrowser
                    url={`https://ipapi.co/?q=${ip}`}
                    onOpen={() => {
                      pop();
                    }}
                  />
                  <Action
                    title="Refresh"
                    onAction={() => revalidate()}
                    icon={Icon.Repeat}
                    shortcut={{ key: "r", modifiers: ["cmd"] }}
                  />
                </ActionPanel>
              }
            />
          )
        );
      })}
    </List>
  );
}
