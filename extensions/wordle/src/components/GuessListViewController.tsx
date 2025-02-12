import { List } from "@raycast/api";
import { UseTextInputReturnType, UseWordleReturnType } from "@src/hooks";
import {
  ChallengeFailureEmptyView,
  ChallengeSuccessEmptyView,
  GuessesEmptyView,
  NewGuessListItem,
  PastGuessListItem,
} from "@src/components";

type ListViewControllerProps = {
  wordleProperties: UseWordleReturnType;
  textInputProperties: UseTextInputReturnType;
};

export const GuessListViewController = ({ wordleProperties, textInputProperties }: ListViewControllerProps) => {
  const { guesses, guessCount, remainingGuesses, isGuessingSuccessful, date, language } = wordleProperties;
  const { isEmpty } = textInputProperties;

  const areGuessesRemaining = remainingGuesses > 0;
  const areGuessesExisting = guesses.length > 0;

  const pastGuessesTitle = `Past Guesses • ${remainingGuesses} Remaining`;

  if (isGuessingSuccessful)
    return <ChallengeSuccessEmptyView guessAmount={guessCount} date={date} language={language} />;
  if (!areGuessesRemaining) return <ChallengeFailureEmptyView date={date} language={language} />;
  if (!isEmpty) {
    return (
      <>
        <List.Section title="Your Guess">
          <NewGuessListItem
            wordleProperties={wordleProperties}
            textInputProperties={textInputProperties}
            index={guessCount + 1}
          />
        </List.Section>
        <List.Section title={pastGuessesTitle}>
          {guesses.map((guess, index) => (
            <PastGuessListItem key={guess.word} guess={guess} index={index + 1} />
          ))}
        </List.Section>
      </>
    );
  }
  if (areGuessesExisting) {
    return (
      <List.Section title={pastGuessesTitle}>
        {guesses.map((guess, index) => (
          <PastGuessListItem key={guess.word} guess={guess} index={index + 1} />
        ))}
      </List.Section>
    );
  }
  return <GuessesEmptyView />;
};
