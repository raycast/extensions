import { ActionPanel, Action, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";

import { videogames } from "./constants/videogames";

export default function Command() {
  const [videogame, setVideoGame] = useState("");

  const { data, isLoading } = useFetch(
    "https://lobby.maisesports.com.br/featured/results?" +
      new URLSearchParams({ videogame: videogame === "" ? "" : videogame }),
    {
      parseResponse: parseFetchResponseMatches,
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
      {data?.map((match) => (
        <List.Section
          title={
            new Date(match.day).toLocaleDateString() === new Date().toLocaleDateString()
              ? "Today"
              : new Date(match.day).toLocaleDateString() === new Date(Date.now() + 86400000).toLocaleDateString()
                ? "Tomorrow"
                : new Date(match.day).toLocaleDateString(undefined, { weekday: "long" })
          }
          subtitle={match.day}
          key={match.day}
        >
          {match.items?.map((item) => <ResultItem key={item.slug} match={item} />)}
        </List.Section>
      ))}
    </List>
  );
}

function ResultItem({ match }: { match: Match }) {
  return (
    <List.Item
      title={match.name}
      subtitle={`(${match.teamAscore}-${match.teamBscore})`}
      accessories={[{ text: match.tournament }, { icon: match.league.image_url }]}
      icon={match.videogame}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Browser" url={match.slug} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

async function parseFetchResponseMatches(response: Response) {
  const responseJson = await response.json();

  const payload = responseJson as Match[] | { error: string };

  if ("error" in payload) {
    throw new Error(payload.error);
  }

  const groupedByDay = payload.reduce((acc, result) => {
    const day = new Date(result.scheduled_at).toLocaleDateString();
    if (!acc[day]) {
      acc[day] = [];
    }
    acc[day].push({
      name: `${result.teamA?.name ?? "TBD"} vs ${result.teamB?.name ?? "TBD"}`,
      number_of_games: result.number_of_games,
      scheduled_at: result.scheduled_at,
      status: result.status,
      slug: `https://esportspass.co/matches/${result.slug}`,
      tournament: `${result.league.name} ${result.serie.full_name}`,
      serie: result.serie,
      league: result.league,
      teamA: result.teamA,
      teamB: result.teamB,
      teamAscore: result.teamAscore,
      teamBscore: result.teamBscore,
      videoGame: result.videoGame,
      videogame: videogames.find((v) => v.slug === result.videoGame.slug)?.icon ?? "",
    });
    return acc;
  }, {} as Schedule);

  return Object.entries(groupedByDay).map(([day, items]) => ({
    day,
    items,
  }));
}

interface Match {
  name: string;
  number_of_games: number;
  scheduled_at: string;
  status: string;
  slug: string;
  tournament?: string;
  teamA: {
    name: string;
  };
  teamB: {
    name: string;
  };
  teamAscore: number;
  teamBscore: number;
  serie: {
    full_name: string;
  };
  league: {
    name: string;
    image_url: string;
  };
  videoGame: {
    name: string;
    slug: string;
  };
  videogame?: string;
}

interface Schedule {
  [key: string]: Match[];
}
