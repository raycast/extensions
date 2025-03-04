import { Action, ActionPanel, Detail, List, PopToRootType, showHUD } from "@raycast/api";
import { showFailureToast, useExec, useFrecencySorting } from "@raycast/utils";
import { execSync } from "child_process";
import { mullvadNotInstalledHint } from "./utils";

type Location = {
  country: string;
  countryCode: string;
  city: string;
  cityCode: string;
  id: string;
  servers: { id: string }[];
};

const countryRegex = /^(?<country>.+)\s\((?<countryCode>.+)\)/;
const cityRegex = /^(?<city>.+)\s\((?<cityCode>.+)\)/;
const serverRegex = /^(?<server>.+?)\s/;

function parseRelayList(rawRelayList: string): Location[] {
  /* eslint-disable @typescript-eslint/no-non-null-assertion */
  const locations: Location[] = [];
  let currentCountry;
  let currentCountryCode;
  let currentServerList: { id: string }[] = [];
  if (rawRelayList) {
    const lines = rawRelayList.split("\n");
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];

      if (line.startsWith("\t")) {
        const cityMatch = line.trim().match(cityRegex);
        if (cityMatch) {
          while (i + 1 < lines.length && lines[i + 1].startsWith("\t\t")) {
            const serverMatch = lines[i + 1].trim().match(serverRegex);
            if (serverMatch) {
              const { server } = serverMatch.groups!;
              currentServerList.push({ id: server });
            }
            i++;
          }

          const { city, cityCode } = cityMatch.groups!;
          locations.push({
            country: currentCountry!,
            countryCode: currentCountryCode!,
            city,
            cityCode,
            id: `${currentCountryCode!}/${cityCode}`,
            servers: currentServerList,
          });
          currentServerList = [];
        }
      } else {
        const countryMatch = line.match(countryRegex);
        if (countryMatch) {
          const { country, countryCode } = countryMatch.groups!;
          currentCountry = country;
          currentCountryCode = countryCode;
        }
      }
      i++;
    }
  }
  /* eslint-enable @typescript-eslint/no-non-null-assertion */
  return locations;
}

function ServerList({
  location,
  visitLocation,
}: {
  location: Location;
  visitLocation: (item: Location) => Promise<void>;
}) {
  const { data: sortedServers, visitItem: visitServer } = useFrecencySorting(location.servers);

  async function setServer(server: { id: string }) {
    visitLocation(location);
    // If we call visitServer directly afterwards, it won't update both frequencies
    setTimeout(() => visitServer(server), 10);

    execSync(`mullvad relay set location ${server.id}`);

    await showHUD("Location changed", { clearRootSearch: true, popToRootType: PopToRootType.Immediate });
  }

  return (
    <List>
      {sortedServers.map((server) => (
        <List.Item
          key={server.id}
          id={server.id}
          title={server.id}
          actions={
            <ActionPanel>
              <Action title="Select Server" onAction={() => setServer(server).catch(showFailureToast)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default function Command() {
  const isMullvadInstalled = useExec("mullvad", ["version"]);
  const rawRelayList = useExec("mullvad", ["relay", "list"], { execute: !!isMullvadInstalled.data });

  const locations = rawRelayList.data ? parseRelayList(rawRelayList.data) : [];
  const { data: sortedLocations, visitItem: visitLocation } = useFrecencySorting(locations);

  if (rawRelayList.isLoading || isMullvadInstalled.isLoading) return <List isLoading={true} />;
  if (!isMullvadInstalled.data || isMullvadInstalled.error) return <Detail markdown={mullvadNotInstalledHint} />;
  if (rawRelayList.error) return <Detail markdown={rawRelayList.error.message} />;
  if (!rawRelayList.data) throw new Error("Couldn't fetch list of relays");

  async function setLocation(location: Location) {
    const [countryCode, cityCode] = location.id.split("/");
    visitLocation(location);

    execSync(`mullvad relay set location ${countryCode} ${cityCode}`);

    await showHUD("Location changed", { clearRootSearch: true, popToRootType: PopToRootType.Immediate });
  }

  return (
    <List>
      {sortedLocations.map((l) => (
        <List.Item
          key={l.id}
          id={l.id}
          title={`${l.country} / ${l.city}`}
          subtitle={`${l.countryCode}-${l.cityCode}`}
          detail={
            <List.Item.Detail
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
              <Action title="Select Location" onAction={() => setLocation(l).catch(showFailureToast)} />
              <Action.Push title="Switch Server" target={<ServerList location={l} visitLocation={visitLocation} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
