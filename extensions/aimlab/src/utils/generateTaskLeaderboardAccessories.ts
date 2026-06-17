import { Color, Icon, List } from "@raycast/api";
import { TaskLeaderboardData } from "../types/taskleaderboard.types";

const generateTaskLeaderboardAccessories = (leaderboardData: TaskLeaderboardData): List.Item.Accessory[] => {
  return [
    { icon: Icon.LineChart },
    { tag: { value: leaderboardData.targets.toFixed().toString() }, tooltip: "Targets" },

    { tag: { value: leaderboardData.shots_hit.toFixed().toString() }, tooltip: "Hits" },
    { tag: { value: roundNumber(leaderboardData.accuracy).toString() + "%" }, tooltip: "Accuracy" },

    { icon: Icon.Clock },
    { tag: { value: roundNumber(leaderboardData.time_per_kill) + "ms" }, tooltip: "time_per_kill" },

    { text: `Score:` },
    { tag: { value: leaderboardData.score.toString(), color: Color.Magenta }, tooltip: "Total Score" },
  ];
};

function roundNumber(num: number) {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export default generateTaskLeaderboardAccessories;
