import { ActionPanel, environment, Icon, List } from "@raycast/api";
import { GUESS_LIMIT } from "@src/constants";
import { useNextPuzzleCountdown } from "@src/hooks";
import { UseWordleReturnType } from "@src/hooks";
import { getUppercaseValue } from "@src/util";
import { getBoardMarkdown } from "@src/util/board";
import { HowToAction, ShowSummaryAction } from "@src/components";

type FinishedBoardListItemProps = {
  wordleProperties: UseWordleReturnType;
};

export const FinishedBoardListItem = ({ wordleProperties }: FinishedBoardListItemProps) => {
  const { guesses, guessCount, isGuessingSuccessful, solution, date, language } = wordleProperties;
  const { countdown, isExpired } = useNextPuzzleCountdown(date);
  const { hours, minutes, seconds } = countdown;

  const detail = (
    <List.Item.Detail
      markdown={getBoardMarkdown({
        guesses,
        input: "",
        isInputInvalid: false,
        language,
        theme: environment.theme,
      })}
    />
  );
  const actions = (
    <ActionPanel>
      <ShowSummaryAction language={language} />
      <HowToAction />
    </ActionPanel>
  );

  // Title-only rows: the list column is narrow, so a title plus subtitle would get truncated.
  return (
    <>
      <List.Item
        icon={isGuessingSuccessful ? "result-win.svg" : "result-loss.svg"}
        title={
          isGuessingSuccessful
            ? `Solved in ${guessCount} of ${GUESS_LIMIT}`
            : `The word was ${getUppercaseValue(solution)}`
        }
        detail={detail}
        actions={actions}
      />
      <List.Item
        icon={Icon.Clock}
        title={isExpired ? "The next puzzle is available" : `Next puzzle in ${hours}h ${minutes}m ${seconds}s`}
        detail={detail}
        actions={actions}
      />
    </>
  );
};
