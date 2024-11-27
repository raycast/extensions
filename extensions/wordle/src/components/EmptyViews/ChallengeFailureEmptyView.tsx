import { Action, ActionPanel, Icon, launchCommand, LaunchType, List } from "@raycast/api";
import { useNextPuzzleCountdown } from "@src/hooks";
import { Language } from "@src/types";
import { showErrorToast } from "@src/util";

type ChallengeFailureEmptyViewProps = {
  date: Date;
  language: Language;
};

export const ChallengeFailureEmptyView = ({ date, language }: ChallengeFailureEmptyViewProps) => {
  const { countdown, isExpired } = useNextPuzzleCountdown(date);
  const { hours, minutes, seconds } = countdown;
  const countdownTitle = isExpired
    ? "The next puzzle is now available!"
    : `Come back in ${hours}h${minutes}m${seconds}s to play the new puzzle!`;

  const showSummary = async () => {
    try {
      await launchCommand({ name: "show_history", type: LaunchType.UserInitiated, context: { language } });
    } catch {
      await showErrorToast({ title: "Failed to show summary" });
    }
  };

  return (
    <List.EmptyView
      icon={{ source: "crying-face.png" }}
      title="You are out of attempts"
      description={countdownTitle}
      actions={
        <ActionPanel>
          <Action icon={Icon.AppWindowList} title="Show Summary" onAction={showSummary} />
        </ActionPanel>
      }
    />
  );
};
