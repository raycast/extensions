import { Action, ActionPanel, closeMainWindow, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useReducer, useState } from "react";
import LanguageConfigError from "./components/LanguageConfigError";
import { useLanguagePair } from "./hooks/useLanguagePair";
import { LanguagePair, storageKeyPrefix, swapLanguagePair } from "./lib/languages";
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

function freshProgress(word: string, translationId: string): FlashcardProgress {
  return {
    word,
    translationId,
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
  | { type: "rate"; rating: Rating; updated: FlashcardProgress }
  | { type: "reset" };

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
        progressMap: new Map(state.progressMap).set(state.sessionCards[state.currentIndex].id, action.updated),
        againCount: state.againCount + (action.rating === "again" ? 1 : 0),
        goodCount: state.goodCount + (action.rating === "good" ? 1 : 0),
        easyCount: state.easyCount + (action.rating === "easy" ? 1 : 0),
      };
    }
    case "reset":
      return initialState;
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
export default function Flashcards(props: { languagePair?: LanguagePair }) {
  const langResult = useLanguagePair();
  const initialPair = props.languagePair ?? langResult.pair;
  const [languagePair, setLanguagePair] = useState<LanguagePair | null>(initialPair);

  // Re-sync when preferences become valid after LanguageConfigError
  if (!languagePair && langResult.pair) {
    setLanguagePair(langResult.pair);
  }

  const [state, dispatch] = useReducer(reducer, initialState);

  const pairKey = languagePair ? storageKeyPrefix(languagePair) : null;

  useEffect(() => {
    if (!languagePair) return;
    let stale = false;
    getSessionCards(languagePair).then(({ sessionCards, progressMap }) => {
      if (!stale) dispatch({ type: "loaded", cards: sessionCards, progressMap });
    });
    return () => {
      stale = true;
    };
  }, [pairKey]);

  if (!languagePair) return <LanguageConfigError message={langResult.error ?? "Invalid language configuration."} />;

  function handleToggleLanguages() {
    dispatch({ type: "reset" });
    setLanguagePair((prev) => {
      if (!prev) return prev;
      const swapped = swapLanguagePair(prev);
      showToast({
        style: Toast.Style.Success,
        title: `${swapped.source.name} → ${swapped.target.name}`,
      });
      return swapped;
    });
  }

  function ToggleLanguagesAction() {
    return (
      <Action
        title="Toggle Languages"
        icon={Icon.Switch}
        shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
        onAction={handleToggleLanguages}
      />
    );
  }

  async function handleRate(rating: Rating) {
    if (!languagePair) return;
    const card = state.sessionCards[state.currentIndex];
    const existing = state.progressMap.get(card.id) ?? freshProgress(card.word, card.id);
    const updated = updateProgress(existing, rating, Date.now());
    const saved = await saveFlashcardProgress(updated, languagePair);
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
    return (
      <List
        navigationTitle={`${languagePair.source.name} → ${languagePair.target.name}`}
        isLoading
        searchBarPlaceholder=""
      />
    );
  }

  if (state.phase === "done") {
    const total = state.againCount + state.goodCount + state.easyCount;
    const description =
      total === 0
        ? "Translate some words first to build your deck."
        : `Again: ${state.againCount}  ·  Good: ${state.goodCount}  ·  Easy: ${state.easyCount}`;
    return (
      <List navigationTitle={`${languagePair.source.name} → ${languagePair.target.name}`} searchBarPlaceholder="">
        <List.EmptyView
          title={total === 0 ? "Nothing to review" : "Session complete!"}
          description={description}
          actions={
            <ActionPanel>
              <Action
                title="Close"
                icon={Icon.XMarkCircle}
                onAction={() => closeMainWindow({ clearRootSearch: true })}
              />
              <ToggleLanguagesAction />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const card = state.sessionCards[state.currentIndex];
  const progress = state.progressMap.get(card.id);
  const isNew = !progress || progress.repetitions === 0;
  const position = `${state.currentIndex + 1} / ${state.sessionCards.length}`;

  const detailMarkdown = buildFlashcardDetailMarkdown(card);

  return (
    <List
      navigationTitle={`${languagePair.source.name} → ${languagePair.target.name}`}
      isShowingDetail={state.revealed}
      searchBarPlaceholder=""
    >
      <List.Item
        key={card.id}
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
                <Action title="Good" onAction={() => handleRate("good")} />
                <Action title="Again" shortcut={{ modifiers: [], key: "1" }} onAction={() => handleRate("again")} />
                <Action title="Easy" shortcut={{ modifiers: [], key: "2" }} onAction={() => handleRate("easy")} />
              </>
            )}
            <ToggleLanguagesAction />
          </ActionPanel>
        }
      />
    </List>
  );
}

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  const makeCard = (word: string): Translation => ({
    id: `${word}-1`,
    word,
    translation: `${word}-translated`,
    partOfSpeech: "noun",
    example: "",
    exampleTranslation: "",
    timestamp: Date.now(),
    type: "word",
  });

  describe("flashcards reducer", () => {
    it("resets to initial state", () => {
      const cards = [makeCard("hello"), makeCard("world")];
      const progressMap = new Map([
        [
          "hello-1",
          {
            word: "hello",
            translationId: "hello-1",
            easeFactor: 2.5,
            interval: 6,
            repetitions: 1,
            nextReviewDate: 0,
          },
        ],
      ]);

      const active = reducer(initialState, { type: "loaded", cards, progressMap });
      const revealed = reducer(active, { type: "reveal" });

      expect(revealed.phase).toBe("studying");
      expect(revealed.revealed).toBe(true);
      expect(revealed.sessionCards).toHaveLength(2);

      const reset = reducer(revealed, { type: "reset" });
      expect(reset).toEqual(initialState);
    });

    it("can load new cards after reset", () => {
      const loaded = reducer(initialState, {
        type: "loaded",
        cards: [makeCard("apple")],
        progressMap: new Map(),
      });

      const reset = reducer(loaded, { type: "reset" });
      expect(reset.phase).toBe("loading");

      const reloaded = reducer(reset, {
        type: "loaded",
        cards: [makeCard("banana")],
        progressMap: new Map(),
      });
      expect(reloaded.phase).toBe("studying");
      expect(reloaded.sessionCards[0].word).toBe("banana");
    });
  });
}
