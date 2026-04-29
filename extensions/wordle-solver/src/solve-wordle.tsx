import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color as RColor,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
} from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { ANSWERS, GUESS_SET } from "./data/wordlists";
import { STARTER, STORAGE_KEY, TURN2_LOOKUP } from "./lib/constants";
import { ALL_GREEN_CODE, encodePattern, patternCodeToKey } from "./lib/pattern";
import { buildPriors } from "./lib/prior";
import { bestGuess, filterAnswers } from "./lib/solver";
import type { Color, GameState, Pattern } from "./lib/types";

type Suggestion =
  | { kind: "word"; word: string; entropy: number | null; remaining: number | null }
  | { kind: "solved"; turns: number }
  | { kind: "stuck" }
  | { kind: "loading" };

const EMPTY_STATE: GameState = { guesses: [] };
const EMPTY_PATTERN: Pattern = ["gray", "gray", "gray", "gray", "gray"];

const RC: Record<Color, RColor> = {
  gray: RColor.SecondaryText,
  yellow: RColor.Yellow,
  green: RColor.Green,
};

const COLOR_NAME: Record<Color, string> = {
  gray: "Absent",
  yellow: "Present",
  green: "Correct",
};

const FORWARD: Record<Color, Color> = { gray: "yellow", yellow: "green", green: "gray" };
const BACKWARD: Record<Color, Color> = { gray: "green", yellow: "gray", green: "yellow" };

export default function Command() {
  const {
    value: state,
    setValue: setState,
    isLoading: storageLoading,
  } = useLocalStorage<GameState>(STORAGE_KEY, EMPTY_STATE);

  const [suggestion, setSuggestion] = useState<Suggestion>({ kind: "loading" });
  const [solving, setSolving] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [draftPattern, setDraftPattern] = useState<Pattern>(EMPTY_PATTERN);
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>();

  const guesses = state?.guesses ?? [];
  const isSolved = useMemo(
    () => guesses.length > 0 && encodePattern(guesses[guesses.length - 1].pattern) === ALL_GREEN_CODE,
    [guesses],
  );

  const wordIsValid = searchText.length === 5 && GUESS_SET.has(searchText);
  const showCurrentGuess = !isSolved && wordIsValid;
  const showInvalidWarning = !isSolved && searchText.length === 5 && !GUESS_SET.has(searchText);

  useEffect(() => {
    if (storageLoading) return;
    let cancelled = false;

    async function compute() {
      if (isSolved) {
        setSuggestion({ kind: "solved", turns: guesses.length });
        return;
      }

      if (guesses.length === 0) {
        setSuggestion({ kind: "word", word: STARTER, entropy: null, remaining: null });
        return;
      }

      let candidates: readonly string[] = ANSWERS;
      for (const g of guesses) {
        candidates = filterAnswers(candidates, g.word, encodePattern(g.pattern));
      }

      if (candidates.length === 0) {
        setSuggestion({ kind: "stuck" });
        return;
      }

      if (candidates.length === 1) {
        setSuggestion({ kind: "word", word: candidates[0], entropy: 0, remaining: 1 });
        return;
      }

      if (guesses.length === 1 && guesses[0].word === STARTER) {
        const key = patternCodeToKey(encodePattern(guesses[0].pattern));
        const lookup = TURN2_LOOKUP[key];
        if (lookup) {
          setSuggestion({ kind: "word", word: lookup, entropy: null, remaining: candidates.length });
          return;
        }
      }

      setSolving(true);
      await new Promise((r) => setTimeout(r, 0));
      if (cancelled) return;

      const weights = buildPriors(candidates);
      const result = bestGuess(candidates, candidates, weights);
      if (cancelled) return;

      if (!result) {
        setSuggestion({ kind: "stuck" });
      } else {
        setSuggestion({
          kind: "word",
          word: result.word,
          entropy: result.entropy,
          remaining: candidates.length,
        });
      }
      setSolving(false);
    }

    compute();
    return () => {
      cancelled = true;
    };
  }, [guesses, storageLoading, isSolved]);

  useEffect(() => {
    if (wordIsValid) setSelectedItemId("letter-0");
  }, [wordIsValid]);

  const cycleLetter = (i: number, dir: "forward" | "backward") =>
    setDraftPattern((prev) => {
      const next = [...prev] as [Color, Color, Color, Color, Color];
      next[i] = (dir === "forward" ? FORWARD : BACKWARD)[prev[i]];
      return next;
    });

  const submitGuess = async () => {
    if (!wordIsValid) return;
    await setState({ guesses: [...guesses, { word: searchText, pattern: draftPattern }] });
    setSearchText("");
    setDraftPattern(EMPTY_PATTERN);
    setSelectedItemId(undefined);
  };

  const onUndo = async (index: number) => {
    await setState({ guesses: guesses.filter((_, i) => i !== index) });
  };

  const onReset = async () => {
    if (guesses.length === 0 && searchText.length === 0) return;
    const ok = await confirmAlert({
      title: "Reset game?",
      message: "Your current guesses will be cleared.",
      primaryAction: { title: "Reset", style: Alert.ActionStyle.Destructive },
    });
    if (ok) {
      await setState(EMPTY_STATE);
      setSearchText("");
      setDraftPattern(EMPTY_PATTERN);
      setSelectedItemId(undefined);
    }
  };

  const resetColors = () => setDraftPattern(EMPTY_PATTERN);

  const copySuggestion = async () => {
    if (suggestion.kind !== "word") return;
    const w = suggestion.word.toUpperCase();
    await Clipboard.copy(w);
    await showToast({ style: Toast.Style.Success, title: `Copied ${w}` });
  };

  const resetAction = (
    <Action
      title="Reset Game"
      icon={Icon.Trash}
      style={Action.Style.Destructive}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
      onAction={onReset}
    />
  );

  const patternAccessories = (word: string, pattern: Pattern): List.Item.Accessory[] =>
    Array.from({ length: 5 }, (_, i) => ({
      tag: { value: word[i].toUpperCase(), color: RC[pattern[i]] },
    }));

  return (
    <List
      filtering={false}
      searchText={searchText}
      onSearchTextChange={(t) => {
        const cleaned = t
          .toLowerCase()
          .replace(/[^a-z]/g, "")
          .slice(0, 5);
        setSearchText(cleaned);
        if (cleaned.length < 5) setDraftPattern(EMPTY_PATTERN);
      }}
      searchBarPlaceholder={isSolved ? "Solved!" : "Type your 5-letter Wordle guess"}
      selectedItemId={selectedItemId}
      onSelectionChange={(id) => setSelectedItemId(id ?? undefined)}
      isLoading={storageLoading || solving}
    >
      {showCurrentGuess && (
        <List.Section title="Current Guess">
          <List.Item
            id="submit"
            title={`Submit "${searchText.toUpperCase()}"`}
            subtitle="↵ submit guess  •  ⌘0 reset colors"
            icon={{ source: Icon.Checkmark, tintColor: RColor.Green }}
            accessories={patternAccessories(searchText, draftPattern)}
            actions={
              <ActionPanel>
                <Action title="Submit Guess" icon={Icon.Checkmark} onAction={submitGuess} />
                <Action
                  title="Reset Colors"
                  icon={Icon.RotateClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "0" }}
                  onAction={resetColors}
                />
                {resetAction}
              </ActionPanel>
            }
          />
          {Array.from({ length: 5 }, (_, i) => (
            <List.Item
              key={`letter-${i}`}
              id={`letter-${i}`}
              title={searchText[i].toUpperCase()}
              subtitle={`${COLOR_NAME[draftPattern[i]]}  •  ↵ cycle  •  ⌘↵ submit`}
              accessories={[{ tag: { value: searchText[i].toUpperCase(), color: RC[draftPattern[i]] } }]}
              actions={
                <ActionPanel>
                  <Action
                    title="Cycle Color Forward"
                    icon={Icon.ArrowDown}
                    onAction={() => cycleLetter(i, "forward")}
                  />
                  <Action
                    title="Submit Guess"
                    icon={Icon.Checkmark}
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                    onAction={submitGuess}
                  />
                  <Action
                    title="Cycle Forward (⌘↓)"
                    icon={Icon.ArrowDown}
                    shortcut={{ modifiers: ["cmd"], key: "arrowDown" }}
                    onAction={() => cycleLetter(i, "forward")}
                  />
                  <Action
                    title="Cycle Backward (⌘↑)"
                    icon={Icon.ArrowUp}
                    shortcut={{ modifiers: ["cmd"], key: "arrowUp" }}
                    onAction={() => cycleLetter(i, "backward")}
                  />
                  <Action
                    title="Reset Colors"
                    icon={Icon.RotateClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "0" }}
                    onAction={resetColors}
                  />
                  {resetAction}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {showInvalidWarning && (
        <List.Section title="Current Guess">
          <List.Item
            title="Not a valid Wordle word"
            subtitle="Edit your guess in the search bar above"
            icon={{ source: Icon.ExclamationMark, tintColor: RColor.Red }}
            actions={<ActionPanel>{resetAction}</ActionPanel>}
          />
        </List.Section>
      )}

      {!showCurrentGuess && !showInvalidWarning && suggestion.kind === "word" && !isSolved && (
        <List.Section title="Suggested">
          <List.Item
            id="suggestion"
            title={suggestion.word.toUpperCase()}
            subtitle={subtitleFor(suggestion)}
            icon={{ source: Icon.LightBulb, tintColor: RColor.Yellow }}
            accessories={[{ text: "↵ Copy" }]}
            actions={
              <ActionPanel>
                <Action title="Copy Suggestion" icon={Icon.Clipboard} onAction={copySuggestion} />
                {resetAction}
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {suggestion.kind === "solved" && (
        <List.Section title="Solved">
          <List.Item
            title={`Solved in ${suggestion.turns}!`}
            subtitle="⌘R reset"
            icon={{ source: Icon.Stars, tintColor: RColor.Green }}
            actions={<ActionPanel>{resetAction}</ActionPanel>}
          />
        </List.Section>
      )}

      {suggestion.kind === "stuck" && (
        <List.Section title="Stuck">
          <List.Item
            title="No candidates remain"
            subtitle="Feedback may be inconsistent — undo a row or reset (⌘R)"
            icon={{ source: Icon.ExclamationMark, tintColor: RColor.Red }}
            actions={<ActionPanel>{resetAction}</ActionPanel>}
          />
        </List.Section>
      )}

      {suggestion.kind === "loading" && !storageLoading && !showCurrentGuess && !showInvalidWarning && (
        <List.Section title="Suggested">
          <List.Item title="Computing…" icon={Icon.Hourglass} />
        </List.Section>
      )}

      {guesses.length > 0 && (
        <List.Section title={`Past Guesses (${guesses.length})`}>
          {guesses.map((g, i) => (
            <List.Item
              key={`${i}-${g.word}`}
              id={`guess-${i}`}
              title={`Guess #${i + 1}`}
              subtitle={`${g.word.toUpperCase()}  •  ⌘Z undo`}
              accessories={patternAccessories(g.word, g.pattern)}
              actions={
                <ActionPanel>
                  <Action
                    title="Copy Word"
                    icon={Icon.Clipboard}
                    onAction={async () => {
                      await Clipboard.copy(g.word.toUpperCase());
                      await showToast({ style: Toast.Style.Success, title: `Copied ${g.word.toUpperCase()}` });
                    }}
                  />
                  <Action
                    title="Undo This Guess"
                    icon={Icon.Undo}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd"], key: "z" }}
                    onAction={() => onUndo(i)}
                  />
                  {resetAction}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function subtitleFor(s: Extract<Suggestion, { kind: "word" }>): string {
  const parts: string[] = [];
  if (s.entropy !== null && s.entropy > 0) parts.push(`+${s.entropy.toFixed(2)} bits`);
  if (s.remaining !== null) parts.push(`${s.remaining} candidate${s.remaining === 1 ? "" : "s"}`);
  parts.push("↵ copy");
  return parts.join(" • ");
}
