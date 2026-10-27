import { UseTextInputReturnType, UseWordleReturnType } from "@src/hooks";
import { BoardListItem, FinishedBoardListItem } from "@src/components";

type ListViewControllerProps = {
  wordleProperties: UseWordleReturnType;
  textInputProperties: UseTextInputReturnType;
};

export const GuessListViewController = ({ wordleProperties, textInputProperties }: ListViewControllerProps) => {
  const { remainingGuesses, isGuessingSuccessful } = wordleProperties;

  if (isGuessingSuccessful || remainingGuesses <= 0)
    return <FinishedBoardListItem wordleProperties={wordleProperties} />;
  return <BoardListItem wordleProperties={wordleProperties} textInputProperties={textInputProperties} />;
};
