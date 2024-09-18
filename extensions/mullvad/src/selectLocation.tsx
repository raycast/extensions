import { Action, ActionPanel, Detail, List, PopToRootType, showHUD } from "@raycast/api";
import { showFailureToast, useExec } from "@raycast/utils";
import { exec, execSync } from "child_process";
import { useState } from "react";
import { promisify } from "node:util";
import { mullvadNotInstalledHint } from "./utils";

type Location = {
  country: string;
  countryCode: string;
  city: string;
  cityCode: string;
  id: string;
};

const countryRegex = /^(?<country>.+)\s\((?<countryCode>.+)\)/;
const cityRegex = /^(?<city>.+)\s\((?<cityCode>.+)\)/;

function parseRelayList(rawRelayList: string): Location[] {
  /* eslint-disable @typescript-eslint/no-non-null-assertion */
  const locations: Location[] = [];
  let currentCountry;
  let currentCountryCode;
  if (rawRelayList)
    for (const line of rawRelayList.split("\n")) {
      if (line.startsWith("\t\t")) continue;

      if (line.startsWith("\t")) {
        const cityMatch = line.trim().match(cityRegex);
        if (cityMatch) {
          const { city, cityCode } = cityMatch.groups!;
          locations.push({
            country: currentCountry!,
            countryCode: currentCountryCode!,
            city,
            cityCode,
            id: `${currentCountryCode!}/${cityCode}`,
          });
        }
        continue;
      }

      const countryMatch = line.match(countryRegex);
      if (countryMatch) {
        const { country, countryCode } = countryMatch.groups!;
        currentCountry = country;
        currentCountryCode = countryCode;
      }
    }
  /* eslint-enable @typescript-eslint/no-non-null-assertion */

  return locations;
}

export default function Command() {
  const isMullvadInstalled = useExec("mullvad", ["version"]);
  const rawRelayList = useExec("mullvad", ["relay", "list"], { execute: !!isMullvadInstalled.data });
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  if (rawRelayList.isLoading || isMullvadInstalled.isLoading) return <List isLoading={true} />;
  if (!isMullvadInstalled.data || isMullvadInstalled.error) return <Detail markdown={mullvadNotInstalledHint} />;
  if (rawRelayList.error) return <Detail markdown={rawRelayList.error.message} />;
  if (!rawRelayList.data) throw new Error("Couldn't fetch list of relays");

  const locations = parseRelayList(rawRelayList.data);

  async function setLocation() {
    if (!selectedLocation) return;
    const [countryCode, cityCode] = selectedLocation.split("/");

    execSync(`mullvad relay set location ${countryCode} ${cityCode}`);

    await showHUD("Location changed", { clearRootSearch: true, popToRootType: PopToRootType.Immediate });
  }

  return (
    <List onSelectionChange={setSelectedLocation}>
      {locations.map((l) => (
        <List.Item
          key={l.id}
          id={l.id}
          title={`${l.country} / ${l.city}`}
          subtitle={`${l.countryCode}-${l.cityCode}`}
          detail={
            <List.Item.Detail
              markdown="test"
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Country Code" text={l.countryCode} />
                  <List.Item.Detail.Metadata.Label title="City Code" text={l.cityCode} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action title="Switch Location" onAction={() => setLocation().catch(showFailureToast)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
