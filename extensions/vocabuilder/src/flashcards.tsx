import { Action, ActionPanel, Color, List, showToast, Toast } from "@raycast/api";
import { useEffect, useReducer } from "react";
import { buildFlashcardDetailMarkdown } from "./lib/markdown";
import { getSessionCards, saveFlashcardProgress } from "./lib/storage";
import { FlashcardProgress, Rating, Translation } from "./lib/types";

function updateProgress(progress: FlashcardProgress, rating: Rating, now: number): FlashcardProgress {
  const dayMs = 86_400_000;
  const prevRepetitions = progress.repetitions;
  const prevInterval = progress.interval;
  const prevEaseFactor = progress.easeFactor;

  let repetitions: number;
  let interval: number;
  let easeFactor = prevEaseFactor;

  if (rating === "again") {
    repetitions = 0;
    interval = 1;
    easeFactor = Math.max(1.3, prevEaseFactor - 0.2);
  } else {
    repetitions = prevRepetitions + 1;
    interval = repetitions < 2 ? (repetitions === 1 ? 6 : 1) : Math.round(prevInterval * prevEaseFactor);

    if (rating === "easy") {
      interval = Math.round(interval * 1.3);
      easeFactor = Math.min(2.5, prevEaseFactor + 0.15);
    }
  }

  return {
    ...progress,
    repetitions,
    interval,
    easeFactor,
    nextReviewDate: now + interval * dayMs,
  };
}

function freshProgress(word: string): FlashcardProgress {
  return {
    word,
    easeFactor: 2.5,
    interval: 1,
    repetitions: 0,
    nextReviewDate: 0,
  };
}

/** Study state phases for the flashcard session reducer. */
type Phase = "loading" | "studying" | "done";

interface StudyState {
  phase: Phase;
  sessionCards: Translation[];
  progressMap: Map<string, FlashcardProgress>;
  currentIndex: number;
  revealed: boolean;
  againCount: number;
  goodCount: number;
  easyCount: number;
}

type StudyAction =
  | {
      type: "loaded";
      cards: Translation[];
      progressMap: Map<string, FlashcardProgress>;
    }
  | { type: "reveal" }
  | { type: "rate"; rating: Rating; updated: FlashcardProgress };

function reducer(state: StudyState, action: StudyAction): StudyState {
  switch (action.type) {
    case "loaded":
      return {
        ...state,
        phase: action.cards.length === 0 ? "done" : "studying",
        sessionCards: action.cards,
        progressMap: action.progressMap,
      };
    case "reveal":
      return { ...state, revealed: true };
    case "rate": {
      const next = state.currentIndex + 1;
      const isDone = next >= state.sessionCards.length;
      return {
        ...state,
        phase: isDone ? "done" : "studying",
        currentIndex: isDone ? state.currentIndex : next,
        revealed: false,
        progressMap: new Map(state.progressMap).set(action.updated.word, action.updated),
        againCount: state.againCount + (action.rating === "again" ? 1 : 0),
        goodCount: state.goodCount + (action.rating === "good" ? 1 : 0),
        easyCount: state.easyCount + (action.rating === "easy" ? 1 : 0),
      };
    }
  }
}

const initialState: StudyState = {
  phase: "loading",
  sessionCards: [],
  progressMap: new Map(),
  currentIndex: 0,
  revealed: false,
  againCount: 0,
  goodCount: 0,
  easyCount: 0,
};

/** Flashcard review command view. */
export default function Flashcards() {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    getSessionCards().then(({ sessionCards, progressMap }) => {
      dispatch({ type: "loaded", cards: sessionCards, progressMap });
    });
  }, []);

  async function handleRate(rating: Rating) {
    const card = state.sessionCards[state.currentIndex];
    const existing = state.progressMap.get(card.word) ?? freshProgress(card.word);
    const updated = updateProgress(existing, rating, Date.now());
    const saved = await saveFlashcardProgress(updated);
    if (!saved) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Flashcard storage is corrupted",
        message: "Progress was not saved to avoid overwriting existing data.",
      });
      return;
    }
    dispatch({ type: "rate", rating, updated });
  }

  if (state.phase === "loading") {
    return <List isLoading searchBarPlaceholder="" />;
  }

  if (state.phase === "done") {
    const total = state.againCount + state.goodCount + state.easyCount;
    const description =
      total === 0
        ? "Translate some words first to build your deck."
        : `Again: ${state.againCount}  ·  Good: ${state.goodCount}  ·  Easy: ${state.easyCount}`;
    return (
      <List searchBarPlaceholder="">
        <List.EmptyView title={total === 0 ? "Nothing to review" : "Session complete!"} description={description} />
      </List>
    );
  }

  const card = state.sessionCards[state.currentIndex];
  const progress = state.progressMap.get(card.word);
  const isNew = !progress || progress.repetitions === 0;
  const position = `${state.currentIndex + 1} / ${state.sessionCards.length}`;

  const detailMarkdown = buildFlashcardDetailMarkdown(card);

  return (
    <List isShowingDetail={state.revealed} searchBarPlaceholder="">
      <List.Item
        key={card.word}
        title={card.word}
        subtitle={state.revealed ? undefined : "···"}
        accessories={[isNew ? { tag: { value: "New", color: Color.Green } } : {}, { text: position }]}
        detail={<List.Item.Detail markdown={detailMarkdown} />}
        actions={
          <ActionPanel>
            {!state.revealed ? (
              <Action title="Reveal Answer" onAction={() => dispatch({ type: "reveal" })} />
            ) : (
              <>
                <Action
                  title="Again (Forgot)"
                  shortcut={{ modifiers: [], key: "1" }}
                  onAction={() => handleRate("again")}
                />
                <Action
                  title="Good (Recalled)"
                  shortcut={{ modifiers: [], key: "2" }}
                  onAction={() => handleRate("good")}
                />
                <Action
                  title="Easy (Instant Recall)"
                  shortcut={{ modifiers: [], key: "3" }}
                  onAction={() => handleRate("easy")}
                />
              </>
            )}
          </ActionPanel>
        }
      />
    </List>
  );
}
