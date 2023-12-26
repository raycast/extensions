import { Action, ActionPanel, closeMainWindow, Detail, List, PopToRootType, showToast, Toast } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { exec } from "child_process";
import { useState } from "react";
import { promisify } from "node:util";

const execAsync = promisify(exec);

type Location = {
  country: string;
  countryCode: string;
  city: string;
  cityCode: string;
  id: string;
};

const countryRegex = /^(?<country>.+)\s\((?<countryCode>.+)\)/;
const cityRegex = /^(?<city>.+)\s\((?<cityCode>.+)\)/;
const mullvadNotInstalledHint = `
# Mullvad is not installed 
  
You can install it from [https://mullvad.net/download/](https://mullvad.net/download/)
`;

export default function Command() {
  const isMullvadInstalled = useExec("which", ["mullvad"]);
  const rawLocationList = useExec("mullvad", ["relay", "list"], { execute: !!isMullvadInstalled.data });
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  if (rawLocationList.isLoading || isMullvadInstalled.isLoading) return <List isLoading={true} />;
  if (!isMullvadInstalled.data || isMullvadInstalled.error) return <Detail markdown={mullvadNotInstalledHint} />;
  if (rawLocationList.error) return <Detail markdown={rawLocationList.error.message} />;

  async function setLocation() {
    if (!selectedLocation) return;
    const [countryCode, cityCode] = selectedLocation.split("/");

    await execAsync(`mullvad relay set location ${countryCode} ${cityCode}`);

    await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
    await showToast({
      style: Toast.Style.Success,
      title: "Location changed",
    });
  }

  const locations: Location[] = [];
  let currentCountry;
  let currentCountryCode;
  if (rawLocationList.data)
    for (const line of rawLocationList.data.split("\n")) {
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
              <Action title="Switch Location" onAction={() => setLocation()} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
