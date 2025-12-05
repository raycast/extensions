import { useState, useEffect, useCallback, useMemo } from "react";
import { ActionPanel, Action, List, Form } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import type { SessionState, SessionEvent, SessionConfig, RomanizerState } from "../types";
import { createInitialSession, reduceSession, getRemainingSeconds } from "../engine/session";
import { formatTime } from "../utils/time";
import { getRandomItem, getSentenceItem } from "../data/corpus";
import { TypingPrompt } from "./components/TypingPrompt";
import { ROMAJI_PROFILES, stepRomanizer } from "../engine/romanizer";

const DIFFICULTY_LABELS: Record<SessionConfig["difficulty"], string> = {
  1: "Beginner",
  2: "Intermediate",
  3: "Advanced",
};

interface PracticeProps {
  config: SessionConfig;
  onComplete: (state: SessionState) => void;
}

export function Practice({ config, onComplete }: PracticeProps) {
  const [sessionState, setSessionState] = useState<SessionState>(createInitialSession());
  const [inputText, setInputText] = useState("");
  const [usedItemIds, setUsedItemIds] = useState<Set<string>>(new Set());
  const [selectedMode, setSelectedMode] = useState<SessionConfig["practiceMode"]>(config.practiceMode);
  const [selectedDuration, setSelectedDuration] = useState<number>(config.durationSec);
  const [selectedDifficulty, setSelectedDifficulty] = useState<SessionConfig["difficulty"]>(config.difficulty);

  useEffect(() => {
    setSelectedMode(config.practiceMode);
    setSelectedDuration(config.durationSec);
    setSelectedDifficulty(config.difficulty);
  }, [config.practiceMode, config.durationSec, config.difficulty]);

  const sessionConfig = useMemo(() => {
    return {
      ...config,
      practiceMode: selectedMode,
      durationSec: selectedDuration,
      difficulty: selectedDifficulty,
    };
  }, [config, selectedMode, selectedDuration, selectedDifficulty]);

  const pickTarget = useCallback(
    (options?: { reset?: boolean }) => {
      const difficulty = sessionConfig.difficulty;
      const useSentenceCorpus = sessionConfig.practiceMode === "sentence";
      const getter = useSentenceCorpus ? getSentenceItem : getRandomItem;

      const shouldReset = Boolean(options?.reset);
      let exclude = shouldReset ? new Set<string>() : new Set(usedItemIds);
      let candidate = getter(difficulty, exclude);
      let nextUsed = shouldReset ? new Set<string>() : new Set(usedItemIds);

      if (!candidate) {
        exclude = new Set<string>();
        nextUsed = new Set<string>();
        candidate = getter(difficulty, exclude);
      }

      if (candidate) {
        nextUsed.add(candidate.id);
      }

      return { target: candidate, usedSet: candidate ? nextUsed : new Set(usedItemIds) };
    },
    [sessionConfig.difficulty, sessionConfig.practiceMode, usedItemIds],
  );

  // Always call useMemo hook to maintain consistent hook order
  const promptDisplay = useMemo(() => {
    return TypingPrompt({ sessionState, config: sessionConfig });
  }, [sessionState, sessionConfig]);

  // タイマー処理
  useEffect(() => {
    if (sessionState.phase !== "running") return;

    const timer = setInterval(() => {
      setSessionState((prev) => {
        const updated = reduceSession(prev, { type: "tick" });
        if (updated.phase === "finished") {
          onComplete(updated);
        }
        return updated;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [sessionState.phase, onComplete]);

  // セッション開始
  const startSession = useCallback(() => {
    const { target, usedSet } = pickTarget({ reset: true });

    if (!target) {
      showFailureToast("No available items");
      return;
    }

    setUsedItemIds(usedSet);

    const event: SessionEvent = {
      type: "start",
      target,
      config: sessionConfig,
    };

    setSessionState((prev) => reduceSession(prev, event));
    setInputText("");
  }, [pickTarget, sessionConfig]);

  // 一時停止/再開
  const togglePause = useCallback(() => {
    const event: SessionEvent = sessionState.phase === "running" ? { type: "pause" } : { type: "resume" };
    setSessionState((prev) => reduceSession(prev, event));
  }, [sessionState.phase]);

  // 終了
  const finishSession = useCallback(() => {
    const event: SessionEvent = { type: "finish" };
    const updated = reduceSession(sessionState, event);
    setSessionState(updated);
    onComplete(updated);
  }, [sessionState, onComplete]);

  // スキップ
  const skipCurrent = useCallback(() => {
    if (sessionConfig.practiceMode === "word") {
      const { target, usedSet } = pickTarget();
      if (!target) {
        showFailureToast("No available items");
        setSessionState((prev) => reduceSession(prev, { type: "finish" }));
        return;
      }

      setUsedItemIds(usedSet);
      setSessionState((prev) => {
        const afterSkip = reduceSession(prev, { type: "skip" });
        return reduceSession(afterSkip, { type: "next-target", target });
      });
      setInputText("");
      return;
    }

    const event: SessionEvent = { type: "skip" };
    setSessionState((prev) => reduceSession(prev, event));
  }, [pickTarget, sessionConfig.practiceMode]);

  // 入力処理
  const handleInputChange = useCallback(
    (text: string) => {
      if (sessionState.phase !== "running") {
        setInputText("");
        return;
      }

      setInputText(text);

      const profile = ROMAJI_PROFILES[sessionConfig.romajiProfile] ?? ROMAJI_PROFILES.jis;
      const readingUnits = sessionState.readingUnits;

      let romanizerState: RomanizerState = { unitIndex: 0, unitProgress: 0, buffer: "" };
      const acceptedChars: string[] = [];
      const acceptedRawChars: string[] = [];
      let blockedChar: string | null = null;

      for (const rawChar of text) {
        const outcome = stepRomanizer(romanizerState, rawChar, readingUnits, profile);
        if (!outcome.accepted) {
          blockedChar = rawChar;
          break;
        }
        romanizerState = outcome.state;
        acceptedChars.push(rawChar.toLowerCase());
        acceptedRawChars.push(rawChar);
      }

      const acceptedHistory = acceptedChars.join("");
      const previousHistory = sessionState.typedHistory;
      const sharedPrefixLength = getSharedPrefixLength(previousHistory, acceptedHistory);
      const events: SessionEvent[] = [];

      const removalCount = previousHistory.length - sharedPrefixLength;
      for (let i = 0; i < removalCount; i++) {
        events.push({ type: "backspace" });
      }

      for (let i = sharedPrefixLength; i < acceptedRawChars.length; i++) {
        const ch = acceptedRawChars[i];
        events.push({ type: "type", ch });
      }

      if (blockedChar && text.length > acceptedRawChars.length && acceptedRawChars.length === sharedPrefixLength) {
        events.push({ type: "type", ch: blockedChar });
      }

      if (events.length === 0) {
        return;
      }

      setSessionState((prev) => {
        let current = prev;
        for (const event of events) {
          const updated = reduceSession(current, event);
          if (updated.phase === "finished" && current.phase !== "finished") {
            onComplete(updated);
          }
          current = updated;
        }
        return current;
      });
    },
    [sessionState.phase, sessionState.readingUnits, sessionState.typedHistory, sessionConfig.romajiProfile, onComplete],
  );

  const remainingSeconds = getRemainingSeconds(sessionState);
  const isPaused = sessionState.phase === "paused";
  const { markdown: promptBaseMarkdown, readingLine } = promptDisplay;
  const promptMarkdown = useMemo(() => {
    if (sessionState.phase === "idle") return "";
    const base = isPaused ? buildPausedMarkdown(promptBaseMarkdown) : promptBaseMarkdown;
    if (readingLine) {
      return `${base}\n\n${readingLine}`;
    }
    return base;
  }, [sessionState.phase, isPaused, promptBaseMarkdown, readingLine]);

  const statusText = sessionState.phase === "paused" ? "Paused" : "Practicing";
  const { metrics } = sessionState;
  const accuracyText = `${(metrics.accuracy * 100).toFixed(1)}%`;

  const { phase, readingUnits, cursorUnitIndex, typedBuffer, target } = sessionState;

  useEffect(() => {
    if (phase !== "running") return;
    if (sessionConfig.practiceMode !== "word") return;
    if (!target) return;
    if (readingUnits.length === 0) return;
    if (cursorUnitIndex < readingUnits.length) return;
    if (typedBuffer.length > 0) return;

    const { target: nextTarget, usedSet } = pickTarget();

    if (!nextTarget) {
      showFailureToast("No available items");
      setSessionState((prev) => reduceSession(prev, { type: "finish" }));
      return;
    }

    const afterComplete = reduceSession(sessionState, { type: "complete-target" });
    const nextState = reduceSession(afterComplete, { type: "next-target", target: nextTarget });
    setSessionState(nextState);
    setUsedItemIds(usedSet);
    setInputText("");
  }, [
    cursorUnitIndex,
    phase,
    pickTarget,
    readingUnits.length,
    sessionConfig.practiceMode,
    sessionState,
    target,
    typedBuffer,
  ]);

  useEffect(() => {
    setUsedItemIds(new Set());
  }, [selectedMode, selectedDifficulty]);

  const handleStartForm = useCallback(() => {
    startSession();
  }, [startSession]);

  // 初回起動時の表示
  if (sessionState.phase === "idle") {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Start" onSubmit={handleStartForm} />
          </ActionPanel>
        }
      >
        <Form.Description
          title="Japanese Typing Practice"
          text={`Practice Japanese romaji typing.\nPlease turn off IME before starting.`}
        />
        <Form.Dropdown
          id="practiceMode"
          title="Practice Mode"
          value={selectedMode}
          onChange={(value) => setSelectedMode(value as SessionConfig["practiceMode"])}
        >
          <Form.Dropdown.Item value="word" title="Word Mode (one word at a time)" />
          <Form.Dropdown.Item value="sentence" title="Sentence Mode (full sentences)" />
        </Form.Dropdown>
        <Form.Dropdown
          id="durationSec"
          title="Duration"
          value={selectedDuration.toString()}
          onChange={(value) => setSelectedDuration(Number(value))}
        >
          <Form.Dropdown.Item value="30" title="30 seconds" />
          <Form.Dropdown.Item value="60" title="60 seconds" />
          <Form.Dropdown.Item value="180" title="180 seconds" />
        </Form.Dropdown>
        <Form.Dropdown
          id="difficulty"
          title="Difficulty"
          value={selectedDifficulty.toString()}
          onChange={(value) => setSelectedDifficulty(Number(value) as SessionConfig["difficulty"])}
        >
          <Form.Dropdown.Item value="1" title="Beginner" />
          <Form.Dropdown.Item value="2" title="Intermediate" />
          <Form.Dropdown.Item value="3" title="Advanced" />
        </Form.Dropdown>
        <Form.Separator />
        <Form.Description
          title="Settings"
          text={`Duration: ${sessionConfig.durationSec}s\nDifficulty: ${DIFFICULTY_LABELS[sessionConfig.difficulty]}\nRomaji: ${sessionConfig.romajiProfile}\nReading: ${sessionConfig.showReading ? "ON" : "OFF"}`}
        />
      </Form>
    );
  }

  return (
    <List
      isShowingDetail
      searchText={inputText}
      onSearchTextChange={handleInputChange}
      enableFiltering={false}
      searchBarPlaceholder="Type here..."
      actions={
        <ActionPanel>
          {sessionState.phase === "running" ? (
            <>
              <Action title="Pause" onAction={togglePause} shortcut={{ modifiers: ["cmd"], key: "p" }} />
              {sessionConfig.practiceMode === "word" && (
                <Action title="Skip" onAction={skipCurrent} shortcut={{ modifiers: ["cmd"], key: "arrowRight" }} />
              )}
            </>
          ) : (
            <Action title="Resume" onAction={togglePause} />
          )}
          <Action title="Finish" onAction={finishSession} shortcut={{ modifiers: ["cmd"], key: "w" }} />
        </ActionPanel>
      }
    >
      <List.Section title="">
        <List.Item
          title="Practicing"
          subtitle={statusText}
          detail={
            <List.Item.Detail
              markdown={promptMarkdown}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Status" text={statusText} />
                  <List.Item.Detail.Metadata.Label title="Time Left" text={formatTime(remainingSeconds)} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="CPM" text={`${metrics.cpm}`} />
                  <List.Item.Detail.Metadata.Label title="WPM" text={`${metrics.wpm}`} />
                  <List.Item.Detail.Metadata.Label title="Accuracy" text={accuracyText} />
                  {sessionConfig.practiceMode === "word" && (
                    <List.Item.Detail.Metadata.Label title="Words" text={`${sessionState.completedWords}`} />
                  )}
                </List.Item.Detail.Metadata>
              }
            />
          }
          accessories={[
            { text: `CPM: ${metrics.cpm}` },
            { text: `WPM: ${metrics.wpm}` },
            { text: `Acc: ${accuracyText}` },
            { text: `Left: ${formatTime(remainingSeconds)}` },
            ...(sessionConfig.practiceMode === "word" ? [{ text: `Words: ${sessionState.completedWords}` }] : []),
          ]}
        />
      </List.Section>
    </List>
  );
}

function buildPausedMarkdown(markdown: string): string {
  return `> ⏸ PAUSED\n\n${markdown}`;
}

function getSharedPrefixLength(a: string, b: string): number {
  const max = Math.min(a.length, b.length);
  let index = 0;
  while (index < max && a[index] === b[index]) {
    index += 1;
  }
  return index;
}
