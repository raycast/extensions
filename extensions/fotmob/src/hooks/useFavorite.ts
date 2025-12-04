import { useEffect, useMemo, useState } from "react";
import type { League, Player, Team } from "@/storages/types";
import { getItem, setItem } from "@/storages";

export function useFavorite() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);

  async function addItems(
    items:
      | { type: "team"; value: Team }
      | {
          type: "player";
          value: Player;
        }
      | {
          type: "league";
          value: League;
        },
  ) {
    if (items.type === "team") {
      const newItems = teams.filter((t) => t.id !== items.value.id);
      setTeams([...newItems, items.value]);
      return setItem("favoriteTeams", [...newItems, items.value]);
    }

    if (items.type === "player") {
      const newItems = players.filter((p) => p.id !== items.value.id);
      setPlayers([...newItems, items.value]);
      return setItem("favoritePlayers", [...newItems, items.value]);
    }

    if (items.type === "league") {
      const newItems = leagues.filter((l) => l.id !== items.value.id);
      setLeagues([...newItems, items.value]);
      return setItem("favoriteLeagues", [...newItems, items.value]);
    }
  }

  async function removeItems(type: "team" | "player" | "league", id: string) {
    if (type === "team") {
      const newItems = teams.filter((t) => t.id !== id);
      setTeams(newItems);
      return setItem("favoriteTeams", newItems);
    }

    if (type === "player") {
      const newItems = players.filter((p) => p.id !== id);
      setPlayers(newItems);
      return setItem("favoritePlayers", newItems);
    }

    if (type === "league") {
      const newItems = leagues.filter((l) => l.id !== id);
      setLeagues(newItems);
      return setItem("favoriteLeagues", newItems);
    }
  }

  async function reloadData() {
    const teams = await getItem("favoriteTeams");
    const players = await getItem("favoritePlayers");
    const leagues = await getItem("favoriteLeagues");

    if (teams) setTeams(teams);
    if (players) setPlayers(players);
    if (leagues) setLeagues(leagues);
  }

  useEffect(() => {
    reloadData();
  }, []);

  return useMemo(
    () => ({
      teams,
      players,
      leagues,
      addItems,
      removeItems,
      reloadData,
    }),
    [teams, players, leagues],
  );
}
