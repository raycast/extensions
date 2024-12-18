import React from "react";
import { PlayerOnIce } from "../utils/types";
import { convertInchesToFeetAndInches, getFlagEmoji, getLanguageKey, teamLogo } from "../utils/helpers";
import { gameActions, timeStrings } from "../utils/translations";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import PlayerDetail from "./playerDetail";
import { PlayerAction } from "./gameActions";

const lang = getLanguageKey();

export default function PlayerListItem({ player }: { player: PlayerOnIce }) {
  if (!player) return null;

  const headshot = (player: PlayerOnIce): string => {
    if (!player) return "";
    if (player.headshot) return player.headshot;

    const seasonId = player.lastSeasonId ?? "";
    const teamAbbrev = player.lastTeamAbbrev ?? "";
    const playerId = player.playerId ?? "";

    return playerId ? `https://assets.nhle.com/mugs/nhl/${seasonId}/${teamAbbrev}/${playerId}.png` : "";
  };

  const getPlayerName = (player: PlayerOnIce): string => {
    if (!player) return "";

    if (typeof player.name === "string") return player.name;

    if (player.name && typeof player.name === "object" && "default" in player.name) {
      return player.name.default ?? "";
    }

    if (player.firstName && player.lastName) {
      const first = typeof player.firstName === "object" ? (player.firstName?.default ?? "") : (player.firstName ?? "");
      const last = typeof player.lastName === "object" ? (player.lastName?.default ?? "") : (player.lastName ?? "");
      return `${first} ${last}`.trim();
    }

    return "";
  };

  const getBirthCity = (player: PlayerOnIce): string => {
    if (!player) return "";
    if (!player.birthCity) return "";

    if (typeof player.birthCity === "string") return player.birthCity;

    return player.birthCity?.default ?? "";
  };

  const playerSubtitle = (player: PlayerOnIce): string => {
    if (!player) return "";

    const parts: string[] = [];

    if (player.teamAbbrev) parts.push(player.teamAbbrev);
    if (player.sweaterNumber) parts.push(`#${player.sweaterNumber}`);
    if (player.positionCode) parts.push(player.positionCode);

    return parts.join(", ");
  };

  // Safely get player ID
  const playerId = Number(player.playerId || player.id || 0);
  if (!playerId) return null;

  // Prepare accessories array with type checking
  const accessories: List.Item.Accessory[] = [];

  // Birth location accessory
  const birthCity = getBirthCity(player);
  const birthCountry = player.birthCountry;
  if (birthCity || birthCountry) {
    const birthLocation = [
      birthCity && `${birthCity},`,
      birthCountry && `${birthCountry} ${getFlagEmoji(birthCountry)}`,
    ]
      .filter(Boolean)
      .join(" ");

    if (birthLocation) {
      accessories.push({ text: birthLocation });
    }
  }

  // Last played season accessory
  if (player.lastSeasonId) {
    accessories.push({
      text: `${timeStrings.lastPlayed[getLanguageKey()]}:${player.lastSeasonId.slice(-4)}`,
    });
  }

  // Height accessory
  if (player.heightInInches) {
    accessories.push({
      tag: { value: convertInchesToFeetAndInches(player.heightInInches) },
    });
  }

  // Weight accessory
  if (player.weightInPounds) {
    accessories.push({
      tag: { value: `${player.weightInPounds} lb` },
    });
  }

  // Team logo accessory
  if (player.teamAbbrev) {
    accessories.push({
      icon: teamLogo(player.teamAbbrev),
    });
  }

  return (
    <List.Item
      key={playerId}
      icon={headshot(player)}
      title={getPlayerName(player)}
      subtitle={playerSubtitle(player)}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.Push
            title={`${gameActions.view[lang]} ${getPlayerName(player)}`}
            target={<PlayerDetail id={playerId} />}
            icon={Icon.Person}
          />
          <PlayerAction name={getPlayerName(player)} slug={player.playerId as string} />
        </ActionPanel>
      }
    />
  );
}
