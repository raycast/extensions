import { Grid } from "@raycast/api";
import { Achievement } from "../../types/index";
import { AchievementCard } from "./AchievementCard";

interface Props {
  achievements: Achievement[];
  onSelectAchievement: (achievement: Achievement) => void;
}

export const AchievementsGrid: React.FC<Props> = ({ achievements, onSelectAchievement }) => {
  return (
    <Grid isLoading={false} navigationTitle="Achievements">
      {achievements.map((achievement) => (
        <AchievementCard key={achievement.id} achievement={achievement} onSelect={onSelectAchievement} />
      ))}
    </Grid>
  );
};
