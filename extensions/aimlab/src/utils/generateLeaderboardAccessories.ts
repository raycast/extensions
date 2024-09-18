import { LeaderboardData } from "../types/leaderboard.types";
import { Color, Icon, List } from "@raycast/api";

const generateLeaderboardAccessories = (leaderboardData: LeaderboardData): List.Item.Accessory[] => {
  return [
    { text: `Average Score`, icon: Icon.LineChart },
    { tag: { value: leaderboardData.avg_score.toFixed().toString() }, tooltip: "Average Score" },
    { text: `Total Score`, icon: Icon.Star },
    { tag: { value: leaderboardData.total_score.toString(), color: Color.Magenta }, tooltip: "Total Score" },
  ];
};

export default generateLeaderboardAccessories;
