import React from "react";
import { PlayerOnIce } from "../utils/types";
import { getFlagEmoji, getLanguageKey, teamLogo } from "../utils/helpers";
import { timeStrings } from "../utils/translations";
import { Action, ActionPanel, List } from "@raycast/api";
import PlayerDetail from "./playerDetail";

export default function PlayerListItem({ player }: { player: PlayerOnIce }) {
	const headshot = function (player: PlayerOnIce) {
    return `https://assets.nhle.com/mugs/nhl/${player.lastSeasonId}/${player.lastTeamAbbrev}/${player.playerId}.png`;
  }

  const playerSubtitle = function(player: PlayerOnIce): string {
    let subtitle = player.teamAbbrev ? `${player.teamAbbrev}, ` : '';
    subtitle += player.sweaterNumber ? `#${player.sweaterNumber}, ` : '';
    subtitle += player.positionCode ? `${player.positionCode}` : '';

    return subtitle;
  }

	return (
		<List.Item
			key={player.playerId}
			icon={headshot(player)}
			title={player.name as string}
			subtitle={playerSubtitle(player)} 
			accessories={[
				{ text: `${player.birthCity ? `${player.birthCity},` :''} ${player.birthCountry ? `${player.birthCountry} ${getFlagEmoji(player.birthCountry)}`: ''}` },
				...(
					player.lastSeasonId ? [{ text: timeStrings.lastPlayed[getLanguageKey()] + ":" + player.lastSeasonId.slice(-4) }] : []

				),
				...(
					player.height ? [{ tag: { value: player.height } }] : []
				),
				...(
					player.weightInPounds ? [{ tag: { value:`${player.weightInPounds} lb` } }] : []
				),
				{ icon: (player.teamAbbrev ? teamLogo(player.teamAbbrev ?? '') : '')},
			]}
			actions={
				<ActionPanel>
					<Action.Push title={`View ${player.name}'s Profile`} target={<PlayerDetail id={player.playerId} />} />
				</ActionPanel>
			}
		/>
	)
}