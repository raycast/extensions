import { Action, ActionPanel, Detail, showToast, Toast, useNavigation } from '@raycast/api';
import { useState, useRef, useEffect } from 'react';
import { Ease } from '../types';
import { useCachedPromise } from '@raycast/utils';
import cardActions from '../api/cardActions';
import guiActions from '../api/guiActions';
import useTurndown from '../hooks/useTurndown';
import { AnkiUncertainError } from '../error/AnkiError';

interface Props {
  deckName: string;
}

export const StudyDeck = ({ deckName }: Props) => {
  const { turndown, isLoading: mediaLoading, error: mediaError } = useTurndown();
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
  } = useCachedPromise(cardActions.cardsDueInfo, [cards], { execute: cards !== undefined });
  const [answerCardId, setAnswerCardId] = useState<number>();
  const [isGrading, setIsGrading] = useState(false);
  const [refreshReason, setRefreshReason] = useState<'saved' | 'uncertain'>();
  const pending = useRef(false);
  const generation = useRef(0);
  const renderedGeneration = generation.current;
  const currentCard = cardsDueInfo?.[0];
  const requiresNativeReview =
    currentCard !== undefined &&
    /\[\[type:|<input\b[^>]*\bid\s*=\s*["']?typeans\b|<canvas\b[^>]*\bid\s*=\s*["']?image-occlusion-canvas\b|<anki-image-occlusion\b|anki\.imageOcclusion\.setup\s*\(/i.test(
      currentCard.question
    );
  const showAnswer = currentCard !== undefined && answerCardId === currentCard.cardId;
  const error = cardsError || cardsDueError || mediaError;
  const isLoading = cardsLoading || cardsDueLoading || mediaLoading || isGrading;
  const canStudy =
    currentCard && turndown && !isLoading && !error && !refreshReason && !requiresNativeReview;

  useEffect(() => {
    if (error && !refreshReason) {
      void showToast({
        title: 'Could Not Load Study Cards',
        message: error.message,
        style: Toast.Style.Failure,
      });
    }
  }, [error, refreshReason]);

  const refreshCards = async () => {
    // useCachedPromise can resolve an Error instead of rejecting a failed refresh.
    const refreshed = await revalidate();
    if (!Array.isArray(refreshed)) throw new Error('Could not refresh the cards due.');
    setRefreshReason(undefined);
  };

  const handleRefresh = async () => {
    if (pending.current) return;
    pending.current = true;
    setIsGrading(true);
    try {
      await refreshCards();
    } catch (error) {
      await showToast({
        title: 'Could Not Refresh Study Cards',
        message: error instanceof Error ? error.message : String(error),
        style: Toast.Style.Failure,
      });
    } finally {
      pending.current = false;
      setIsGrading(false);
    }
  };

  const handleAnswerCard = async (ease: Ease) => {
    if (!canStudy || !showAnswer || pending.current || renderedGeneration !== generation.current)
      return;
    pending.current = true;
    setIsGrading(true);
    let answered = false;
    try {
      const success = await cardActions.answerCard(currentCard.cardId, ease);
      if (!success) throw new Error('Anki did not accept this answer.');
      answered = true;
      generation.current += 1;
      setAnswerCardId(undefined);
      setRefreshReason('saved');
      await refreshCards();
    } catch (error) {
      let title = answered ? 'Answer Saved, Refresh Failed' : 'Could Not Save Answer';
      if (!answered && error instanceof AnkiUncertainError) {
        generation.current += 1;
        setAnswerCardId(undefined);
        setRefreshReason('uncertain');
        title = 'Answer Status Unknown';
      }
      await showToast({
        title,
        message: error instanceof Error ? error.message : String(error),
        style: Toast.Style.Failure,
      });
    } finally {
      pending.current = false;
      setIsGrading(false);
    }
  };

  let markdown: string | undefined;
  if (refreshReason && !isGrading) {
    markdown =
      refreshReason === 'saved'
        ? '## Answer saved\n\nRefresh the study cards to continue.'
        : '## Answer status unknown\n\nAnki may have saved this answer. Check Anki, then refresh the study cards before continuing.';
  } else if (error) {
    markdown = '## Could not load study cards\n\nCheck Anki and try again, or study in Anki.';
  } else if (!isLoading && cardsDueInfo?.length === 0) {
    markdown = '## Congratulations! You have finished this deck for now.';
  } else if (requiresNativeReview) {
    markdown =
      '## Study this card in Anki\n\nThis card uses image masks or typed answers that need Anki’s reviewer. Choose Study in Anki to continue.';
  } else if (currentCard && turndown) {
    markdown = turndown.turndown(showAnswer ? currentCard.answer : currentCard.question);
  }

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          {canStudy && !showAnswer ? (
            <Action title="Show Answer" onAction={() => setAnswerCardId(currentCard.cardId)} />
          ) : canStudy && showAnswer ? (
            <ActionPanel.Section title="Card Actions">
              <Action title="Good" onAction={() => handleAnswerCard(Ease.Good)} />
              <Action
                title="Again"
                shortcut={{ modifiers: ['ctrl'], key: '1' }}
                onAction={() => handleAnswerCard(Ease.Again)}
              />
              <Action
                title="Hard"
                shortcut={{ modifiers: ['ctrl'], key: '2' }}
                onAction={() => handleAnswerCard(Ease.Hard)}
              />
              <Action
                title="Easy"
                shortcut={{ modifiers: ['ctrl'], key: '4' }}
                onAction={() => handleAnswerCard(Ease.Easy)}
              />
            </ActionPanel.Section>
          ) : null}
          {refreshReason && !isGrading ? (
            <Action title="Refresh Study Cards" onAction={handleRefresh} />
          ) : null}
          <Action
            title="Study in Anki"
            onAction={async () => {
              try {
                await guiActions.guiDeckReview(deckName);
              } catch (error) {
                await showToast({
                  title: 'Could Not Open Anki Reviewer',
                  message: error instanceof Error ? error.message : String(error),
                  style: Toast.Style.Failure,
                });
              }
            }}
          />
          <Action title="Go Back" onAction={pop} />
        </ActionPanel>
      }
    />
  );
};
