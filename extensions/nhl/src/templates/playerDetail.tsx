import React from "react";
import { ActionPanel, Action, Detail } from "@raycast/api";
import { getNHL } from "../utils/nhlData";
import { PlayerDetailResponse, GoalieStats, SkaterStats, PlayerBio } from "../utils/types";
import { userInterface } from "../utils/translations";
import { convertInchesToFeetAndInches, getFlagEmoji, getLanguageKey, calculateAge } from "../utils/helpers";
import { playerTitleStrings, gameStrings } from "../utils/translations";
import Unresponsive from "./unresponsive";
import { useFetch } from "@raycast/utils";

const lang = getLanguageKey();

type Player = {
	data: PlayerDetailResponse;
	isLoading: boolean;
}

type PlayerBioResponse = {
	data: PlayerBio;
	isLoading: boolean;
}

// Type guard for GoalieStats
function isGoalieStats(stats: GoalieStats | SkaterStats): stats is GoalieStats {
  return 'goalsAgainstAvg' in stats;
}

// Type guard for SkaterStats
function isSkaterStats(stats: GoalieStats | SkaterStats): stats is SkaterStats {
  return 'assists' in stats;
}

const summaryStats = function(
	player: PlayerDetailResponse, 
	stats?: GoalieStats | SkaterStats | null,
	title?: string,
): string {
	if (!stats || !player || !title) return '';

	let table = `${title} \n`;

	if (player.position === 'G' && isGoalieStats(stats)) {
			table += `| GP | W | L | SO | GAA | SV% |\n`;
			table += `|---|---|---|---|---|---|\n`;
			table += `| ${stats.gamesPlayed ?? 0} | ${stats.wins ?? 0} | ${stats.losses ?? 0} | ${stats.shutouts ?? 0} | ${
					stats.goalsAgainstAvg ? stats.goalsAgainstAvg.toFixed(3) : '0.000'
			} | ${
					stats.savePctg ? (100 * stats.savePctg).toFixed(2) : '0.00'
			}% |`;
	}
	else if (isSkaterStats(stats)) {
			// Skater stats
			table += `| GP | G | A | P | +/- |\n`;
			table += `|---|---|---|---|---|\n`;
			table += `| ${stats.gamesPlayed ?? '-'} | ${stats.goals ?? '-'} | ${stats.assists ?? '-'} | ${stats.points ?? '-'} | ${
					stats.plusMinus ?? '-'
			} |`;
	}

	return table;
}

export default function PlayerDetail({ id }: { id: number }) {
	const playerData = getNHL(`player/${id}/landing`) as Player;
	const playerBio = useFetch(`https://forge-dapi.d3.nhle.com/v2/content/en-us/players?tags.slug=playerid-${id}`) as PlayerBioResponse;

	if (playerData.isLoading || playerBio.isLoading) return <Detail isLoading={true} markdown={userInterface.loading[getLanguageKey()]}/>;

	if (!playerData.data && !playerBio.data) return <Unresponsive />;

	const player = playerData.data;
	const heroImage = player?.heroImage ? `![](${player.heroImage})` : '';

	let playerMarkdown = `# ${player.firstName?.default} ${player.lastName?.default} ${player.sweaterNumber ? `#${player.sweaterNumber}` : ''}, ${player.position} <img src="${player.headshot}" width="50" height="50" /> ${player.inHHOF ? '<img src="https://assets.nhle.com/badges/hockey_hof.svg" width="50" height="50" />' : ''} ${player.inTop100AllTime ? '<img src="https://assets.nhle.com/badges/100_greatest_players.svg" width="50" height="50">' : ''} \n --- \n ${heroImage} \n `;
	
	// Last season
	if( player.featuredStats?.regularSeason?.subSeason) {
		playerMarkdown += summaryStats(player, player.featuredStats?.regularSeason?.subSeason, ((player.featuredStats.season).toString().slice(-4) + ' ' + gameStrings.seasonStats[lang])) + '\n\n';
	}

	// Career
	playerMarkdown += summaryStats(player, player.featuredStats?.regularSeason?.career, playerTitleStrings.career[lang]) + '\n\n';

	// Last playoff appearance
	if( player.featuredStats?.regularSeason?.subSeason) {
		playerMarkdown += summaryStats(player, player.featuredStats?.playoffs?.subSeason, ((player.featuredStats.season).toString().slice(-4) + ' ' + gameStrings.playoffs[lang])) + '\n\n';
	}

	// Career Playoffs
	playerMarkdown += summaryStats(player, player.featuredStats?.playoffs?.career, (playerTitleStrings.career[lang] + ' ' + gameStrings.playoffs[lang])) + '\n\n';

	// Player Bio
	if(playerBio.data.items[0] && playerBio.data.items[0].fields.biography) {
		playerMarkdown += `## ${userInterface.biography[lang]} \n ${playerBio.data.items[0].fields.biography} \n\n`;
	}


	const birthday = function(player: PlayerDetailResponse): string {
		let birthday = '';
		birthday += player.birthDate ? `${player.birthDate}` : '';

		if (player.isActive) {
			birthday += ` (${playerTitleStrings.age[lang]}: ${calculateAge(player.birthDate)})`;
		}

		return birthday
	}

	const shootsOrCatches = (player: PlayerDetailResponse): string => {
		if (!player.shootsCatches) return '';
	
		const key = player.position === 'G' ? 'catches' : 'shoots';
		return playerTitleStrings[key][lang];
	};

	const draftInfo = function(player: PlayerDetailResponse): string {
		const draft = player?.draftDetails;

		if(!draft) return '';

		return `${draft.year}, ${draft.teamAbbrev} (${draft.overallPick} ${playerTitleStrings.overall[lang]}), ${playerTitleStrings.round[lang]}${draft.round}, ${playerTitleStrings.pick[lang]}${draft.pickInRound}`;
	}

  return (
    <Detail
			actions={
				<ActionPanel>
					<Action.OpenInBrowser url={`https://www.nhl.com/${(player.teamCommonName.default)?.toLowerCase()}/player/${player.firstName.default}-${player.lastName.default}-${player.playerId}`} />
				</ActionPanel>
			}
			metadata={
				<Detail.Metadata>
					<Detail.Metadata.Label title={playerTitleStrings.birthplace[lang]} text={`${player.birthCity.default ? `${player.birthCity.default},` :''} ${player.birthCountry ? `${player.birthCountry} ${getFlagEmoji(player.birthCountry)}`: ''}`}/>
					{player.heightInInches && 
						<Detail.Metadata.Label title={playerTitleStrings.height[lang]} text={convertInchesToFeetAndInches(player.heightInInches)}/> 
					}
					{player.weightInPounds && 
						<Detail.Metadata.Label title={playerTitleStrings.weight[lang]} text={`${player.weightInPounds} lb`}/>
					}
					{player.birthDate &&
						<Detail.Metadata.Label title={playerTitleStrings.birthdate[lang]} text={birthday(player)} />
					}
					{player.shootsCatches && 
						<Detail.Metadata.Label title={shootsOrCatches(player)} text={player.shootsCatches} />
					}
					{player.draftDetails && 
						<Detail.Metadata.Label title={playerTitleStrings.draft[lang]} text={draftInfo(player)} />
					}
				</Detail.Metadata>
			}
			markdown={playerMarkdown} 
		/>
  );
}
