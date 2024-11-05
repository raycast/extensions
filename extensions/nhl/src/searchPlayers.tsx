import { Action, ActionPanel, List, LaunchProps, Detail } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import Unresponsive from "./templates/unresponsive";
import { PlayerOnIce } from "./utils/types";
import { getFlagEmoji, getLanguageKey, teamLogo } from "./utils/helpers";
import { timeStrings } from "./utils/translations";
import PlayerDetail from "./templates/playerDetail";
interface Player {
  data: PlayerOnIce[];
  isLoading: boolean;
}

export default function Command(props: LaunchProps) {
  const { name } = props.arguments;
  const playerType = props.arguments.playerType || 'true';

  const {isLoading, data} = useFetch(`https://search.d3.nhle.com/api/v1/search/player?culture=en-us&limit=100&q=${name}*&active=${playerType}`) as Player;

  const players = data;

  if (isLoading) return <List isLoading={true} />

  if (!players) return <Unresponsive />


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
    <List
      filtering={true}
      navigationTitle="Search Players"
    >
      {players.map((player) => (
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
      ))}
    </List>
  );
}
