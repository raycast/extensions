import { List, Icon, ActionPanel, Action, Color } from "@raycast/api";
import { Achievement } from "../../types/index";

interface Props {
  achievement: Achievement;
  onBack: () => void;
}

export const AchievementDetails: React.FC<Props> = ({ achievement, onBack }) => {
  return (
    <List navigationTitle="Achievement Details">
      <List.Item
        title={achievement.title}
        subtitle={achievement.unlocked ? "Unlocked!" : "Locked"}
        icon={{
          source: achievement.unlocked ? achievement.icon : Icon.Lock,
          tintColor: achievement.unlocked ? Color.Blue : undefined,
        }}
        actions={
          <ActionPanel>
            <Action title="Go Back" onAction={onBack} />
          </ActionPanel>
        }
      />
      <List.Item title="Description" subtitle={achievement.description} icon={Icon.Info} />
      <List.Item
        title="Status"
        subtitle={achievement.unlocked ? "Unlocked" : "Locked"}
        icon={achievement.unlocked ? Icon.CheckCircle : Icon.Lock}
      />
      <List.Item
        title="Details"
        subtitle={
          achievement.unlocked
            ? "Congratulations on unlocking this achievement!"
            : "Keep going, you can unlock this soon!"
        }
        icon={Icon.Info}
      />
    </List>
  );
};
