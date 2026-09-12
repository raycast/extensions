import { ActionPanel, Action, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";

import { videogames } from "./constants/videogames";

export default function Command() {
  const [videogame, setVideoGame] = useState("");

  const { data, isLoading } = useFetch(
    "https://lobby.maisesports.com.br/featured/series?" +
      new URLSearchParams({ videogame: videogame === "" ? "" : videogame }),
    {
      parseResponse: parseFetchResponseTournaments,
    },
  );

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by game" storeValue onChange={(newValue) => setVideoGame(newValue)}>
          <List.Dropdown.Item title="All games" value="" />
          <List.Dropdown.Item icon="./lol.png" title="League of legends" value="league-of-legends" />
          <List.Dropdown.Item icon="./valorant.png" title="VALORANT" value="valorant" />
          <List.Dropdown.Item icon="./cs.png" title="Counter-Strike" value="cs-go" />
        </List.Dropdown>
      }
    >
      <List.Section title="Tournaments" subtitle={`${data?.length || 0} tournaments`}>
        {data?.map((item) => <TournamentItem key={item.slug} tournament={item} />)}
      </List.Section>
    </List>
  );
}

function TournamentItem({ tournament }: { tournament: Tournament }) {
  return (
    <List.Item
      title={`${tournament.league.name} ${tournament.full_name}`}
      accessories={[{ text: tournament.videoGame.name }, { icon: tournament.videogame }]}
      icon={tournament.league.image_url}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Browser" url={tournament.url} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

async function parseFetchResponseTournaments(response: Response) {
  const responseJson = await response.json();

  const payload = responseJson as Tournament[] | { error: string };

  if ("error" in payload) {
    throw new Error(payload.error);
  }

  return payload.map((item) => {
    return {
      name: item.name,
      full_name: item.full_name,
      slug: item.slug,
      region: item.region,
      type: item.type,
      country: item.country,
      league: {
        name: item.league.name,
        image_url: item.league.image_url,
      },
      videoGame: {
        name: item.videoGame.name,
        slug: item.videoGame.slug,
      },
      videogame: videogames.find((v) => v.slug === item.videoGame.slug)?.icon,
      url: `https://esportspass.co/leagues/${item.slug}`,
    };
  });
}

interface Tournament {
  name: string;
  full_name: string;
  slug: string;
  region: string;
  type: string;
  country: string;
  league: {
    name: string;
    image_url: string;
  };
  videoGame: {
    name: string;
    slug: string;
  };
  videogame?: string;
  url: string;
}
