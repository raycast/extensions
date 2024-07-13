import { Detail, ActionPanel, Action, popToRoot, open } from "@raycast/api";
import { Workout } from "../interfaces/workout";

interface WorkoutCompletionScreenProps {
  workout: Workout;
}

export function WorkoutCompletionScreen({ workout }: WorkoutCompletionScreenProps) {
  const handleFinish = async () => {
    await open("raycast://confetti");
    await popToRoot();
  };

  return (
    <Detail
      markdown={`
# 🎉 Workout Completed!

Congratulations on finishing your **${workout.name}** workout!

You've completed ${workout.exerciseIds.length} exercises:

${workout.exerciseIds.map((exercise, index) => `${index + 1}. ${exercise}`).join("\n")}

Great job on staying committed to your fitness journey! 💪
      `}
      actions={
        <ActionPanel>
          <Action title="Finish" onAction={handleFinish} />
        </ActionPanel>
      }
    />
  );
}
