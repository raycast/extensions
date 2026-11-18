import { Action, ActionPanel, Color, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useRef, useState } from "react";
import type {
  GenericTrainingResult,
  GenericTrainingResultItem,
  MixedTrainingItem,
  SupportedLanguage,
  WritingSelectionTrainingItem,
} from "../types";
import { TrainingType } from "../types";
import { createApiClient } from "../api";
import { formatDefinitionText, formatRaycastError, playSpeech } from "../utils";
import type { TrainingProgress } from "./MixedTrainingRouter";

interface WritingSelectionTrainingProps {
  items: MixedTrainingItem[];
  userLanguage: SupportedLanguage;
  onComplete?: (results: GenericTrainingResultItem[]) => void;
  progress?: TrainingProgress;
}

export function WritingSelectionTraining({ items, userLanguage, onComplete, progress }: WritingSelectionTrainingProps) {
  const { pop } = useNavigation();
  const [queue, setQueue] = useState<MixedTrainingItem[]>([...items]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedLetters, setSelectedLetters] = useState<string[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const resultsRef = useRef<GenericTrainingResultItem[]>([]);

  const currentItem = queue[currentIndex];
  const payload = currentItem.payload as WritingSelectionTrainingItem;

  function selectLetter(letter: string) {
    if (showResult) return;
    setSelectedLetters([...selectedLetters, letter]);
  }

  function checkAnswer() {
    const userAnswer = selectedLetters.join("");
    const correctAnswer = payload.answer.join("");
    const correct = userAnswer === correctAnswer;

    setIsCorrect(correct);
    setShowResult(true);
    playSpeech(payload.text, payload.speechUrl);

    const resultItem: GenericTrainingResultItem = {
      question: {
        learningItemId: payload.learningItemId,
        definitionId: payload.definition?.id,
      },
      answers: correct ? [{ learningItemId: payload.learningItemId }] : [],
      trainingType: TrainingType.WRITING_SELECTION,
    };

    resultsRef.current = [...resultsRef.current, resultItem];
    if (!correct) {
      setQueue((prev) => [...prev, prev[currentIndex]]);
    }
  }

  function handleGiveUp() {
    setShowResult(true);
    setIsCorrect(false);
    playSpeech(payload.text, payload.speechUrl);

    const resultItem: GenericTrainingResultItem = {
      question: {
        learningItemId: payload.learningItemId,
        definitionId: payload.definition?.id,
      },
      answers: [],
      trainingType: TrainingType.WRITING_SELECTION,
    };

    resultsRef.current = [...resultsRef.current, resultItem];
    setQueue((prev) => [...prev, prev[currentIndex]]);
  }

  function handleOverride() {
    if (resultsRef.current.length > 0) {
      const lastIndex = resultsRef.current.length - 1;
      resultsRef.current[lastIndex] = {
        ...resultsRef.current[lastIndex],
        answers: [{ learningItemId: payload.learningItemId }],
      };
      setIsCorrect(true);
      setQueue((prev) => prev.slice(0, -1));
      showToast({ style: Toast.Style.Success, title: "Marked as correct" });
    }
  }

  async function handleNext() {
    if (currentIndex < queue.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedLetters([]);
      setShowResult(false);
      setIsCorrect(false);
    } else if (onComplete) {
      onComplete(resultsRef.current);
    } else {
      await submitResults();
    }
  }

  async function submitResults() {
    try {
      const client = createApiClient();
      const result: GenericTrainingResult = {
        items: resultsRef.current,
        trainingType: TrainingType.WRITING_SELECTION,
      };
      await client.trainings.submitTrainingResult(userLanguage, result);

      const correct = resultsRef.current.filter((r) => r.answers.length > 0).length;
      showToast({
        style: Toast.Style.Success,
        title: "Training complete!",
        message: `Score: ${correct}/${resultsRef.current.length}`,
      });
    } catch (error) {
      const userError = formatRaycastError(error);
      showToast({
        style: Toast.Style.Failure,
        title: userError.title,
        message: userError.description,
      });
    }
    pop();
  }

  function handleSearchTextChange(text: string) {
    if (showResult) return;

    // Validate that every character in the new text can be formed from available options
    const pool = [...payload.options];
    const validChars: string[] = [];
    for (const char of text) {
      const idx = pool.indexOf(char);
      if (idx !== -1) {
        validChars.push(char);
        pool.splice(idx, 1);
      }
    }

    // Only accept if all typed characters are valid options
    if (validChars.length === text.length) {
      setSelectedLetters(validChars);
    }
  }

  const currentAnswer = selectedLetters.join("");
  const definition = formatDefinitionText(payload.definition);
  const isComplete = selectedLetters.length === payload.answer.length;

  const giveUpAction = (
    <Action
      title="Give up"
      icon={Icon.XMarkCircle}
      shortcut={{ modifiers: ["cmd"], key: "g" }}
      onAction={handleGiveUp}
    />
  );

  return (
    <List
      navigationTitle={`Writing (${(progress?.offset ?? 0) + currentIndex + 1}/${(progress?.total ?? items.length) + queue.length - items.length})`}
      filtering={false}
      searchText={currentAnswer}
      onSearchTextChange={handleSearchTextChange}
      searchBarPlaceholder="Type your answer..."
    >
      <List.Section title={`Definition: ${definition}`}>
        <List.Item
          icon={Icon.Text}
          title={currentAnswer || "(empty)"}
          subtitle="Your answer"
          accessories={
            showResult
              ? [
                  {
                    tag: {
                      value: isCorrect ? "Correct" : "Incorrect",
                      color: isCorrect ? Color.Green : Color.Red,
                    },
                  },
                ]
              : undefined
          }
          actions={
            <ActionPanel>
              {!showResult ? (
                <>
                  {isComplete && <Action title="Submit" onAction={checkAnswer} />}
                  {giveUpAction}
                </>
              ) : (
                <>
                  <Action title={currentIndex < queue.length - 1 ? "Next" : "Finish"} onAction={handleNext} />
                  {!isCorrect && (
                    <Action
                      title="I Was Right"
                      icon={Icon.CheckCircle}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={handleOverride}
                    />
                  )}
                </>
              )}
            </ActionPanel>
          }
        />
        {showResult && !isCorrect && (
          <List.Item icon={Icon.ExclamationMark} title={payload.text} subtitle="Correct answer" />
        )}
      </List.Section>

      {!showResult && (
        <List.Section title="Available Letters">
          {payload.options.map((letter, index) => {
            const usedCount = selectedLetters.filter((s) => s === letter).length;
            const totalCount = payload.options.filter((o) => o === letter).length;
            const isAvailable = usedCount < totalCount;

            return (
              <List.Item
                key={index}
                icon={isAvailable ? Icon.Circle : Icon.CheckCircle}
                title={letter}
                accessories={!isAvailable ? [{ tag: { value: "used", color: Color.SecondaryText } }] : undefined}
                actions={
                  <ActionPanel>
                    {isAvailable && <Action title={`Select "${letter}"`} onAction={() => selectLetter(letter)} />}
                    {isComplete && (
                      <Action title="Submit" shortcut={{ modifiers: ["cmd"], key: "return" }} onAction={checkAnswer} />
                    )}
                    {giveUpAction}
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
