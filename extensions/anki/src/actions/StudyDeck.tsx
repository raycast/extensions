import { Action, ActionPanel, Detail, showToast, Toast, useNavigation } from '@raycast/api';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardField, CardFieldObj, Ease, ShortcutDictionary } from '../types';
import { useCachedPromise } from '@raycast/utils';
import cardActions from '../api/cardActions';
import useTurndown from '../hooks/useTurndown';
import { AnkiError } from '../error/AnkiError';

interface Props {
  deckName: string;
}

export const StudyDeck = ({ deckName }: Props) => {
  const { turndown } = useTurndown();

  const { pop } = useNavigation();
  const {
    data: cards,
    isLoading: cardsLoading,
    error: cardsError,
  } = useCachedPromise(cardActions.findCards, [deckName]);

  const {
    data: cardsDueInfo,
    isLoading: cardsDueLoading,
    error: cardsDueError,
    revalidate,
  } = useCachedPromise(cardActions.cardsDueInfo, [cards]);

  const shortcuts = useMemo((): ShortcutDictionary => {
    return {
      againAction: { modifiers: ['ctrl'], key: '1' },
      hardAction: { modifiers: ['ctrl'], key: '2' },
      easyAction: { modifiers: ['ctrl'], key: '4' },
      showCardInfo: { modifiers: ['cmd'], key: 'i' },
    };
  }, []);

  useEffect(() => {
    if (cardsError) {
      const isAnkiError = cardsError instanceof AnkiError;
      showToast({
        title: isAnkiError ? 'Anki Error' : 'Error',
        message: isAnkiError ? cardsError.message : 'Unknown error occured',
        style: Toast.Style.Failure,
      });
    }
  }, [cardsError]);

  const [showAnswer, setShowAnswer] = useState(false);
  const [showCardInfo, setShowCardInfo] = useState(false);
  const [currentCard, setCurrentCard] = useState<Card | undefined>();

  const parseFields = useCallback((fields: CardFieldObj): Array<CardField> => {
    return Object.entries(fields).map(([fieldName, field]) => ({
      fieldName: fieldName,
      value: field.value,
    }));
  }, []);

  const renderMarkdownString = useCallback(
    (fields: Array<CardField>, showAnswer: boolean) => {
      if (!turndown) return;
      const { value: questionValue } = fields[0];

      const question = turndown.turndown(`${questionValue}\n`.replace(/\n/g, '<br>'));

      const answers = fields.slice(1).map(answer => {
        return turndown.turndown(`\n\n---\n\n${answer.value}\n`.replace(/\n/g, '<br>'));
      });

      return showAnswer ? question + answers.join('\n') : question;
    },
    [turndown]
  );

  useEffect(() => {
    if (!cardsDueInfo) return;
    setCurrentCard(cardsDueInfo[0]);
  }, [cardsDueInfo]);

  const cardView = useMemo(() => {
    if (!cardsDueInfo || cardsDueLoading) return;

    if (cardsDueError) {
      showToast({
        title: 'Error: cardsDueError',
        message: `Getting cards due failed`,
      });
    }
    if (!cardsDueInfo.length) return '## Congratulations! You have finished this deck for now.';
    return renderMarkdownString(parseFields(cardsDueInfo[0].fields), showAnswer);
  }, [showAnswer, cardsDueInfo, parseFields]);

  const handleShowCardInfo = () => setShowCardInfo(!showCardInfo);
  const handleShowAnswer = () => setShowAnswer(!showAnswer);
  const handleAnswerCard = useCallback(
    async (ease: Ease) => {
      if (!currentCard) return;
      try {
        const success = await cardActions.answerCard(currentCard.cardId, ease);

        if (!success) return;
        setShowAnswer(false);
        revalidate();
      } catch (error) {
        const isAnkiError = error instanceof AnkiError;
        showToast({
          title: isAnkiError ? 'Anki Error' : 'Error',
          message: isAnkiError ? error.message : 'Unknown error occured',
          style: Toast.Style.Failure,
        });
      }
    },
    [currentCard]
  );

  return (
    <Detail
      markdown={cardView}
      isLoading={cardsLoading || cardsDueLoading}
      actions={
        <ActionPanel>
          {!showAnswer && cardsDueInfo?.length ? (
            <Action title="Show Answer" onAction={handleShowAnswer} />
          ) : cardsDueInfo?.length ? (
            <>
              <ActionPanel.Section title="Card Actions">
                <Action title="Good" onAction={async () => await handleAnswerCard(Ease.Good)} />
                <Action
                  title="Again"
                  shortcut={shortcuts.againAction}
                  onAction={async () => await handleAnswerCard(Ease.Again)}
                />
                <Action
                  title="Hard"
                  shortcut={shortcuts.hardAction}
                  onAction={async () => await handleAnswerCard(Ease.Hard)}
                />
                <Action
                  title="Easy"
                  shortcut={shortcuts.easyAction}
                  onAction={async () => await handleAnswerCard(Ease.Easy)}
                />
              </ActionPanel.Section>
              <ActionPanel.Section />
              <Action
                title="Show Card Info"
                shortcut={shortcuts.showCardInfo}
                onAction={handleShowCardInfo}
              />
            </>
          ) : (
            <Action title="Go Back" onAction={pop} />
          )}
        </ActionPanel>
      }
    />
  );
};
