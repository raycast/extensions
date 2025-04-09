import { Action, ActionPanel, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { ChampionResponse } from "./types";

export default function Command() {
  const { isLoading, data } = useFetch<ChampionResponse>(
    "https://ddragon.leagueoflegends.com/cdn/15.7.1/data/en_US/champion.json",
    {
      headers: {
        "User-Agent": "Raycast",
        Accept: "application/json",
      },
    },
  );

  const champions = Object.values(data?.data ?? {}).map((champion) => ({
    id: champion.id,
    name: champion.name,
    image: champion.image,
  }));

  return (
    <List isLoading={isLoading}>
      {champions.map((champion) => (
        <List.Item
          key={champion.id}
          title={champion.name}
          icon={`https://ddragon.leagueoflegends.com/cdn/15.7.1/img/champion/${champion.image.full}`}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`https://dpm.lol/champions/${champion.id}/build`} />
              <Action.OpenInBrowser url={`https://dpm.lol/champions/${champion.id}/build/pro`} title="Pro Build" />
              <Action.OpenInBrowser url={`https://dpm.lol/champions/${champion.id}/matchups`} title="Matchups" />
              <Action.OpenInBrowser url={`https://dpm.lol/leaderboards/otps/${champion.id}`} title="Otps" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
