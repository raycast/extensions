import { Action, ActionPanel, Color, Icon, List, openExtensionPreferences } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { BASE_URL, Player, getAuthHeaders, parseListResponse } from "./api";

export default function SearchPlayers() {
  const [searchText, setSearchText] = useState("");

  const url = new URL(`${BASE_URL}/players`);
  url.searchParams.set("limit", "50");
  if (searchText) {
    url.searchParams.set("search", searchText);
  }

  // Without a search term the API returns players ranked first — a useful default.
  const { isLoading, data, error, revalidate } = useFetch(url.toString(), {
    headers: getAuthHeaders(),
    parseResponse: (response) => parseListResponse<Player>(response),
    keepPreviousData: true,
    failureToastOptions: { title: "Could not search players" },
  });

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search players by name"
      onSearchTextChange={setSearchText}
      throttle
    >
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Could Not Search Players"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : (
        <>
          <List.EmptyView icon={Icon.Person} title="No Players Found" description="Try a different name." />
          {(data?.data ?? []).map((player) => (
            <PlayerItem key={player.id} player={player} />
          ))}
        </>
      )}
    </List>
  );
}

function PlayerItem(props: { player: Player }) {
  const { player } = props;

  const accessories: List.Item.Accessory[] = [];
  if (player.ranking_movement === "up") {
    accessories.push({ icon: { source: Icon.ArrowUp, tintColor: Color.Green }, tooltip: "Ranking moved up" });
  } else if (player.ranking_movement === "down") {
    accessories.push({ icon: { source: Icon.ArrowDown, tintColor: Color.Red }, tooltip: "Ranking moved down" });
  }
  if (player.ranking != null) {
    accessories.push({ tag: `#${player.ranking}`, tooltip: "Current ranking" });
  }
  if (player.ranking_points != null) {
    accessories.push({ text: `${player.ranking_points} pts` });
  }
  if (player.country) {
    accessories.push({ tag: player.country.toUpperCase(), tooltip: "Country" });
  }

  return (
    <List.Item
      title={player.name}
      subtitle={subtitleFor(player)}
      icon={player.is_doubles_team ? Icon.TwoPeople : Icon.Person}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Name and Ranking"
            content={player.ranking != null ? `${player.name} (#${player.ranking})` : player.name}
          />
        </ActionPanel>
      }
    />
  );
}

function subtitleFor(player: Player): string | undefined {
  const parts: string[] = [];
  // Player.tour is the record's own granular value (e.g. "challenger_men");
  // it is displayed as-is, per the API docs.
  if (player.tour) {
    parts.push(player.tour.toUpperCase());
  }
  if (player.hand) {
    parts.push(player.hand === "R" ? "Right-handed" : "Left-handed");
  }
  if (player.birthday) {
    const age = ageFrom(player.birthday);
    if (age != null) {
      parts.push(`${age} y/o`);
    }
  }
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

function ageFrom(birthday: string): number | null {
  // The API serves a date-only value; compare its literal Y-M-D against the
  // user's local calendar date so the age never shifts across time zones.
  const parsed = /^(\d{4})-(\d{2})-(\d{2})/.exec(birthday);
  if (!parsed) {
    return null;
  }
  const [year, month, day] = [Number(parsed[1]), Number(parsed[2]), Number(parsed[3])];
  const now = new Date();
  let age = now.getFullYear() - year;
  const beforeBirthday = now.getMonth() + 1 < month || (now.getMonth() + 1 === month && now.getDate() < day);
  if (beforeBirthday) {
    age -= 1;
  }
  return age >= 0 && age < 130 ? age : null;
}
