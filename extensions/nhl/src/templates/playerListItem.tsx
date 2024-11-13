import React from "react";
import { PlayerOnIce } from "../utils/types";
import { convertInchesToFeetAndInches, getFlagEmoji, getLanguageKey, teamLogo } from "../utils/helpers";
import { timeStrings } from "../utils/translations";
import { Action, ActionPanel, List } from "@raycast/api";
import PlayerDetail from "./playerDetail";

export default function PlayerListItem({ player }: { player: PlayerOnIce }) {
  const headshot = function (player: PlayerOnIce) {
    if (player.headshot) return player.headshot;
    return `https://assets.nhle.com/mugs/nhl/${player.lastSeasonId}/${player.lastTeamAbbrev}/${player.playerId}.png`;
  };

  const getPlayerName = (player: PlayerOnIce): string => {
    if (typeof player.name === "string") return player.name;
    if (typeof player.name === "object") return player.name.default;
    if (player.firstName && player.lastName) {
      return `${player.firstName.default} ${player.lastName.default}`;
    }
    return "";
  };

  const getBirthCity = (player: PlayerOnIce): string => {
    if (typeof player.birthCity === "string") return player.birthCity;
    if (typeof player.birthCity === "object") return player.birthCity.default;
    return "";
  };

  const playerSubtitle = function (player: PlayerOnIce): string {
    let subtitle = player.teamAbbrev ? `${player.teamAbbrev}, ` : "";
    subtitle += player.sweaterNumber ? `#${player.sweaterNumber}, ` : "";
    subtitle += player.positionCode ? `${player.positionCode}` : "";
    return subtitle;
  };

  return (
    <List.Item
      key={player.playerId ?? player.id}
      icon={headshot(player)}
      title={getPlayerName(player)}
      subtitle={playerSubtitle(player)}
      accessories={[
        {
          text: `${getBirthCity(player) ? `${getBirthCity(player)},` : ""} ${player.birthCountry ? `${player.birthCountry} ${getFlagEmoji(player.birthCountry)}` : ""}`,
        },
        ...(player.lastSeasonId
          ? [{ text: timeStrings.lastPlayed[getLanguageKey()] + ":" + player.lastSeasonId.slice(-4) }]
          : []),
        ...(player.heightInInches ? [{ tag: { value: convertInchesToFeetAndInches(player.heightInInches) } }] : []),
        ...(player.weightInPounds ? [{ tag: { value: `${player.weightInPounds} lb` } }] : []),
        { icon: player.teamAbbrev ? teamLogo(player.teamAbbrev) : "" },
      ]}
      actions={
        <ActionPanel>
          <Action.Push
            title={`View ${getPlayerName(player)}'s Profile`}
            target={<PlayerDetail id={Number(player.playerId || player.id)} />}
          />
        </ActionPanel>
      }
    />
  );
}
