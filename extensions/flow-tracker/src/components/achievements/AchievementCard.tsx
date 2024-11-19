import { Grid, Icon, ActionPanel, Action, Color } from "@raycast/api";
import { Achievement } from "../../types/index";

interface Props {
  achievement: Achievement;
  onSelect: (achievement: Achievement) => void;
}

export const AchievementCard: React.FC<Props> = ({ achievement, onSelect }) => {
  return (
    <Grid.Item
      title={achievement.title}
      content={{ source: achievement.icon, tintColor: achievement.unlocked ? Color.Blue : Color.SecondaryText }}
      subtitle={achievement.unlocked ? "Unlocked!" : "Locked"}
      actions={
        <ActionPanel>
          <Action title="View Details" onAction={() => onSelect(achievement)} />
        </ActionPanel>
      }
      accessory={{
        icon: {
          source: achievement.unlocked ? Icon.CheckCircle : Icon.Circle,
          tintColor: achievement.unlocked ? Color.Green : Color.Red,
        },
        tooltip: achievement.unlocked ? "Unlocked" : "Locked",
      }}
    />
  );
};
