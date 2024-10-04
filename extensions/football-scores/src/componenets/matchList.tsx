import { List } from "@raycast/api";
import { Match } from "../types/today-matches";
import { timeCalculator } from "../utils/timeCalculator";

export default function MatchList({ match }: { match: Match }) {
  const accessories: List.Item.Accessory[] = [];

  const matchVersus = `${match.homeTeam.shortName}  🆚  ${match.awayTeam.shortName}`;
  const matchTime = timeCalculator(match.utcDate);

  switch (match.status) {
    case "TIMED":
    case "SCHEDULED":
      accessories.push({ icon: "🕒", text: matchTime, tooltip: "Match date" });
      break;
    case "IN_PLAY":
      accessories.push({ icon: "🟢", text: "In play", tooltip: "Match status" });
      if (match.score.halfTime.home != null) {
        accessories.push({
          icon: "⚽",
          text: match.score.halfTime.home + " - " + match.score.halfTime.away,
          tooltip: "Current score",
        });
      }
      break;
    case "PAUSED":
      accessories.push({ icon: "🟡", text: "Half Time", tooltip: "Match status" });
      if (match.score.halfTime.home != null) {
        accessories.push({
          icon: "⚽",
          text: match.score.halfTime.home + " - " + match.score.halfTime.away,
          tooltip: "Half time score",
        });
      }
      break;
    case "FINISHED":
      if (match.score.fullTime.home != null) {
        accessories.push({
          icon: "🏁",
          text: match.score.fullTime.home + " - " + match.score.fullTime.away,
          tooltip: "Full time score",
        });
      }
      break;
    default:
      break;
  }

  return (
    <List.Item
      key={match.id}
      title={`${matchVersus}`}
      icon={{ source: match.competition.emblem }}
      accessories={accessories}
    />
  );
}
