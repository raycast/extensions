import { Action, ActionPanel, Color, List } from "@raycast/api";
import { useEffect, useReducer } from "react";
import { getSessionCards, saveFlashcardProgress } from "./lib/storage";
import { FlashcardProgress, Rating, Translation } from "./lib/types";

// ─── SM-2 Algorithm ──────────────────────────────────────────────────────────
//
// TODO: Implement SM-2 spaced repetition algorithm.
//
//   AGAIN: repetitions=0, interval=1, EF=max(1.3, EF-0.2)
//   GOOD:  repetitions++; interval = rep<2 ? (rep===1 ? 6 : 1) : round(prev*EF)
//   EASY:  same as GOOD; interval=round(interval*1.3); EF=min(2.5, EF+0.15)
//
//   nextReviewDate = now + interval * 86_400_000
//   Do NOT mutate `progress` — return a new object.
//
function updateProgress(
  progress: FlashcardProgress,
  rating: Rating,
  now: number,
): FlashcardProgress {
  void rating; // remove when implementing
  return { ...progress, nextReviewDate: now + progress.interval * 86_400_000 };
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

// ─── State machine ────────────────────────────────────────────────────────────

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
        progressMap: new Map(state.progressMap).set(
          action.updated.word,
          action.updated,
        ),
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function Flashcards() {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    getSessionCards().then(({ sessionCards, progressMap }) => {
      dispatch({ type: "loaded", cards: sessionCards, progressMap });
    });
  }, []);

  async function handleRate(rating: Rating) {
    const card = state.sessionCards[state.currentIndex];
    const existing =
      state.progressMap.get(card.word) ?? freshProgress(card.word);
    const updated = updateProgress(existing, rating, Date.now());
    await saveFlashcardProgress(updated);
    dispatch({ type: "rate", rating, updated });
  }

  // ── Loading ──
  if (state.phase === "loading") {
    return <List isLoading searchBarPlaceholder="" />;
  }

  // ── Done / empty ──
  if (state.phase === "done") {
    const total = state.againCount + state.goodCount + state.easyCount;
    const description =
      total === 0
        ? "Translate some words first to build your deck."
        : `Again: ${state.againCount}  ·  Good: ${state.goodCount}  ·  Easy: ${state.easyCount}`;
    return (
      <List searchBarPlaceholder="">
        <List.EmptyView
          title={total === 0 ? "Nothing to review" : "Session complete!"}
          description={description}
        />
      </List>
    );
  }

  // ── Studying ──
  const card = state.sessionCards[state.currentIndex];
  const progress = state.progressMap.get(card.word);
  const isNew = !progress || progress.repetitions === 0;
  const position = `${state.currentIndex + 1} / ${state.sessionCards.length}`;

  const detailMarkdown = `# ${card.word}

**${card.partOfSpeech}** · ${card.translation}

---

*${card.example}*

${card.exampleTranslation}`;

  return (
    <List isShowingDetail={state.revealed} searchBarPlaceholder="">
      <List.Item
        key={card.word}
        title={card.word}
        subtitle={state.revealed ? undefined : "···"}
        accessories={[
          isNew ? { tag: { value: "New", color: Color.Green } } : {},
          { text: position },
        ]}
        detail={<List.Item.Detail markdown={detailMarkdown} />}
        actions={
          <ActionPanel>
            {!state.revealed ? (
              <Action
                title="Reveal Answer"
                onAction={() => dispatch({ type: "reveal" })}
              />
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
