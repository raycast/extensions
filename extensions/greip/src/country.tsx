import React, { useState } from "react";
import { Toast, ActionPanel, Action, getPreferenceValues, List, Detail, showToast, Icon } from "@raycast/api";
import { Preferences } from "./types/preferences";
import countries from "./data/countries.json";
import { getGreipActions } from "./utils";
import axios from "axios";

interface Country {
  name: string;
  code: string;
  image: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error>();
  const [data, setData] = useState({
    countryCode: "---",
    countryName: "---",
    countryGeoNameID: "---",
    capital: "---",
    population: "---",
    language: { name: "---", code: "---", native: "---" },
    phoneCode: "---",
    currency: { currencyName: "---", currencyCode: "---", currencySymbol: "---" },
    countryIsEU: true,
    countryNeighbours: "---",
    tld: "---",
    timezone: {
      name: "---",
      abbreviation: "---",
      offset: "---",
      currentTime: "---",
      currentTimestamp: "---",
      isDST: false,
      sunInfo: {},
    },
    continentName: "---",
    continentCode: "---",
    continentGeoNameID: "---",
  });

  const showDetails = async (countryCode: string) => {
    setReady(true);
    setLoading(true);
    await axios
      .get(
        `https://gregeoip.com/Country?key=${preferences.apikey}&CountryCode=${countryCode}&lang=${preferences.lang}&params=language,currency,timezone`
      )
      .then((data) => {
        if (data?.data?.status == "success") {
          setData(data?.data?.data);
        } else {
          setError(new Error(data?.data?.description));
        }
        setLoading(false);
      })
      .catch(() => {
        setError(new Error("Unknown Error!"));
      });
  };

  React.useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error.message,
      });
    }
  }, [error]);

  const countriesArray: Country[] = countries as Country[];

  return (
    <List throttle isShowingDetail={ready}>
      {countriesArray
        .sort(function (a, b) {
          const x = a.name.toLowerCase();
          const y = b.name.toLowerCase();
          return x < y ? -1 : x > y ? 1 : 0;
        })
        .map((item) => (
          <List.Item
            icon={{ source: item.image }}
            title={item.name}
            key={item.code}
            actions={
              <ActionPanel>
                <Action title="Show Details" icon={Icon.AppWindowSidebarLeft} onAction={() => showDetails(item.code)} />
                <ActionPanel.Section title="Copy result">
                  {/* <Action.CopyToClipboard content={data.ip} /> */}
                  <Action.CopyToClipboard
                    content={JSON.stringify(data, null, 2)}
                    title="Copy full information (JSON)"
                  />
                </ActionPanel.Section>
                {getGreipActions()}
              </ActionPanel>
            }
            detail={
              <List.Item.Detail
                isLoading={loading}
                metadata={
                  <Detail.Metadata>
                    <Detail.Metadata.Label title="Name" text={data.countryName} />
                    <Detail.Metadata.Label title="Code" text={data.countryCode} />
                    <Detail.Metadata.Label title="Geo Name ID" text={data.countryGeoNameID.toString()} />
                    <Detail.Metadata.Label title="Capital" text={data.capital} />
                    <Detail.Metadata.Label title="Population" text={data.population.toLocaleString().toString()} />
                    <Detail.Metadata.Label title="Neighbours" text={data.countryNeighbours.toString()} />
                    <Detail.Metadata.Label title="TLD" text={data.tld} />
                    <Detail.Metadata.Label title="Phone Code" text={"+" + data.phoneCode.toString()} />
                    <Detail.Metadata.Label title="Continent Name" text={data.continentName} />
                    <Detail.Metadata.Label title="Continent Code" text={data.continentCode} />
                    <Detail.Metadata.Label title="Continent Geo Name ID" text={data.continentGeoNameID.toString()} />
                    <Detail.Metadata.Separator />
                    <Detail.Metadata.Label title="Language Name" text={data.language.name} />
                    <Detail.Metadata.Label title="Language Code" text={data.language.code} />
                    <Detail.Metadata.Label title="Language Native Name" text={data.language.native} />
                    <Detail.Metadata.Separator />
                    <Detail.Metadata.Label title="Currency Name" text={data.currency.currencyName} />
                    <Detail.Metadata.Label title="Currency Code" text={data.currency.currencyCode} />
                    <Detail.Metadata.Label title="Currency Symbol" text={data.currency.currencySymbol} />
                    <Detail.Metadata.Separator />
                    <Detail.Metadata.Label title="Timezone Name" text={data.timezone.name} />
                    <Detail.Metadata.Label title="Timezone Abbreviation" text={data.timezone.abbreviation} />
                    <Detail.Metadata.Label title="Current Time" text={data.timezone.currentTime} />
                    <Detail.Metadata.Label title="Current Timestamp" text={data.timezone.currentTimestamp.toString()} />
                    <Detail.Metadata.Label title="isDST" text={data.timezone.isDST ? "Yes" : "No"} />
                  </Detail.Metadata>
                }
              />
            }
          />
        ))}
    </List>
  );
}
