import { getPreferenceValues } from "@raycast/api";
import { List, Action, ActionPanel } from "@raycast/api";
import { Game } from "../utils/types";
import { getOrdinalPeriod, formatLocalTime, getScoreColor } from "../utils/helpers";
import { gameActions } from "../utils/translations";
import { getLanguageKey } from "../utils/helpers";
import { gameStates } from "../utils/translations";
import GameDetail from "./gameDetail";
import GameActions from "./gameActions";

const preferences = getPreferenceValues();
const language = preferences.language as "default" | "fr";
const languageKey = getLanguageKey();

function gameAccessories(game: Game) {
  switch (game.gameState) {
    case "OFF":
      return gameStates.final[languageKey];
    case "FUT":
      return "";
    case "CRIT":
      return `${gameStates.crit[languageKey]}: ${game.periodDescriptor?.number}`;
    case "LIVE":
      return `${getOrdinalPeriod(game.periodDescriptor?.number)}`;
    case "PRE":
      return `${gameStates.preGame[languageKey]}`;
    default:
      return gameStates.final[languageKey];
  }
}

export default function GameList({ title, games }: { title: string; games: Game[] }) {
  return (
    <List.Section title={title}>
      {games.length > 0
        ? games.map((game) => (
            <List.Item
              key={game.id}
              title={`${game.awayTeam.name[languageKey]} @ ${game.homeTeam.name[languageKey]}`}
              subtitle={gameAccessories(game)}
              accessories={[
                { text: formatLocalTime(game.startTimeUTC) },
                {
                  tag: { value: String(game.awayTeam.score ?? ""), color: getScoreColor(game, "Away") },
                  icon: game.awayTeam.logo,
                },
                { text: "vs" },
                {
                  tag: { value: String(game.homeTeam.score ?? ""), color: getScoreColor(game, "Home") },
                  icon: game.homeTeam.logo,
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push title={gameActions.showGame[language]} target={<GameDetail game={game} />} />
                  <GameActions game={game} />
                </ActionPanel>
              }
            />
          ))
        : null}
    </List.Section>
  );
}
