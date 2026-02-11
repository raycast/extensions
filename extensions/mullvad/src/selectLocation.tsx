import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  List,
  PopToRootType,
  showHUD,
  showToast,
  Cache,
  getPreferenceValues,
} from "@raycast/api";
import { showFailureToast, useExec, useFrecencySorting } from "@raycast/utils";
import { execSync } from "child_process";
import { mullvadNotInstalledHint } from "./utils";
import RankingCache from "./RankingCache";
import { useRef } from "react";

type Location = {
  country: string;
  countryCode: string;
  city: string;
  cityCode: string;
  id: string;
  servers: Server[];
};

type Server = {
  id: string;
};

const cache = new Cache({ namespace: "rankings" });

const countryRegex = /^(?<country>.+)\s\((?<countryCode>.+)\)/;
const cityRegex = /^(?<city>.+)\s\((?<cityCode>.+)\)/;
const serverRegex = /^(?<server>.+?)\s/;

function parseRelayList(rawRelayList: string): Location[] {
  /* eslint-disable @typescript-eslint/no-non-null-assertion */
  const locations: Location[] = [];
  let currentCountry;
  let currentCountryCode;
  let currentServerList: Server[] = [];
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
  setTopServer,
}: {
  location: Location;
  visitLocation: (item: Location) => Promise<void>;
  setTopServer: (server: Server) => void;
}) {
  const {
    data: sortedServers,
    visitItem: visitServer,
    resetRanking,
  } = useFrecencySorting(location.servers, { namespace: `servers-${location.id}` });

  const rankingCacheRef = useRef(new RankingCache<Set<string>>(cache, new Set<string>()));

  async function setServer(server: Server) {
    await visitLocation(location);
    await visitServer(server);

    rankingCacheRef.current.update(`ranked-servers-${location.id}`, (value) => {
      if (value === undefined) return new Set<string>([server.id]);
      value.add(server.id);
      return value;
    });

    setTopServer(sortedServers[0]);
    execSync(`mullvad relay set location ${server.id}`);

    await showHUD("Location changed", { clearRootSearch: true, popToRootType: PopToRootType.Immediate });
  }

  async function resetServerRanking(server: Server) {
    try {
      await resetRanking(server);
      if (rankingCacheRef.current.get(`ranked-servers-${location.id}`).size > 1) {
        setTopServer(sortedServers[0]);
      } else {
        setTopServer({ id: "" });
      }

      rankingCacheRef.current.update(`ranked-servers-${location.id}`, (value) => {
        if (value === undefined) return new Set<string>();
        value.delete(server.id);
        return value;
      });
      showToast({ title: `Reset ranking for ${server.id}` });
    } catch (error) {
      if (error instanceof Error)
        showFailureToast({ title: `Failed to reset ranking for ${server.id}`, message: error.message });
    }
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
              <Action
                title="Select Server"
                icon={Icon.Stars}
                onAction={() => setServer(server).catch(showFailureToast)}
              />
              <Action
                title="Reset Server Ranking"
                icon={Icon.ArrowCounterClockwise}
                onAction={() => resetServerRanking(server)}
                shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default function Command() {
  const isMullvadInstalled = useExec("mullvad", ["--version"]);
  const rawRelayList = useExec("mullvad", ["relay", "list"], { execute: !!isMullvadInstalled.data });

  const locations = rawRelayList.data ? parseRelayList(rawRelayList.data) : [];
  const {
    data: sortedLocations,
    visitItem: visitLocation,
    resetRanking: resetRanking,
  } = useFrecencySorting(locations, { namespace: "locations" });

  const rankingCacheRef = useRef(new RankingCache<Record<string, string>>(cache, {}));

  const { selectByRanking } = getPreferenceValues<Preferences.SelectLocation>();

  if (rawRelayList.isLoading || isMullvadInstalled.isLoading) return <List isLoading={true} />;
  if (!isMullvadInstalled.data || isMullvadInstalled.error) return <Detail markdown={mullvadNotInstalledHint} />;
  if (rawRelayList.error) return <Detail markdown={rawRelayList.error.message} />;
  if (!rawRelayList.data) throw new Error("Couldn't fetch list of relays");

  async function setLocation(location: Location) {
    const [countryCode, cityCode] = location.id.split("/");
    await visitLocation(location);

    let topServerID = "";
    if (selectByRanking) topServerID = rankingCacheRef.current.get("top-servers")?.[location.id] || "";
    execSync(`mullvad relay set location ${countryCode} ${cityCode} ${topServerID}`);

    await showHUD("Location changed", { clearRootSearch: true, popToRootType: PopToRootType.Immediate });
  }

  function resetLocationRanking(location: Location) {
    try {
      resetRanking(location);
      showToast({ title: `Reset ranking for ${location.country} / ${location.city}` });
    } catch (error) {
      if (error instanceof Error)
        showFailureToast({
          title: `Failed to reset ranking for ${location.country} / ${location.city}`,
          message: error.message,
        });
    }
  }

  function setTopServersForLocation(location: Location, server: Server) {
    rankingCacheRef.current.update("top-servers", (value) => {
      return { ...value, [location.id]: server.id };
    });
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
              <Action
                title="Select Location"
                icon={Icon.Stars}
                onAction={() => setLocation(l).catch(showFailureToast)}
              />
              <Action.Push
                title="Switch Server"
                icon={Icon.Building}
                target={
                  <ServerList
                    location={l}
                    visitLocation={visitLocation}
                    setTopServer={(server: Server) => setTopServersForLocation(l, server)}
                  />
                }
              />
              <Action
                title="Reset Location Ranking"
                icon={Icon.ArrowCounterClockwise}
                onAction={() => {
                  resetLocationRanking(l);
                }}
                shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
