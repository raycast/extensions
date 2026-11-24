import { Color, List } from "@raycast/api";
import { JSX } from "react";
import { Match } from "../types";
import {
  formatKickoff,
  isLive,
  isUpcoming,
  liveClock,
  matchStatusIcon,
  roundLabel,
  scoreline,
  stadiumName,
  teamName,
} from "../utils";
import MatchActions from "./match_actions";

export default function MatchItem({
  match,
  actions,
}: {
  match: Match;
  actions?: JSX.Element | false;
}) {
  const accessories: List.Item.Accessory[] = [];

  if (isLive(match)) {
    accessories.push({ tag: { value: liveClock(match), color: Color.Red } });
  } else if (match.score?.aggregate && match.leg?.number === 2) {
    accessories.push({
      tag: {
        value: `Agg ${match.score.aggregate.home}-${match.score.aggregate.away}`,
        color: Color.SecondaryText,
      },
    });
  }

  accessories.push({ text: roundLabel(match), tooltip: stadiumName(match) });

  const home = teamName(match.homeTeam);
  const away = teamName(match.awayTeam);

  return (
    <List.Item
      key={match.id}
      icon={matchStatusIcon(match)}
      title={formatKickoff(match, "HH:mm")}
      subtitle={
        isUpcoming(match)
          ? `${home} vs ${away}`
          : `${home} ${scoreline(match)} ${away}`
      }
      keywords={[
        home,
        away,
        match.homeTeam.internationalName,
        match.awayTeam.internationalName,
        match.homeTeam.teamCode,
        match.awayTeam.teamCode,
      ]}
      accessories={accessories}
      actions={<MatchActions match={match} extra={actions} />}
    />
  );
}
