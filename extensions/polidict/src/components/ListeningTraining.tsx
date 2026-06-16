import { Action, ActionPanel, Color, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import type {
  GenericTrainingResult,
  GenericTrainingResultItem,
  ListeningOption,
  ListeningTrainingItem,
  MixedTrainingItem,
  SupportedLanguage,
} from "../types";
import { TrainingType } from "../types";
import { createApiClient } from "../api";
import { formatRaycastError, playSpeech } from "../utils";
import type { TrainingProgress } from "./MixedTrainingRouter";

interface ListeningTrainingProps {
  items: MixedTrainingItem[];
  userLanguage: SupportedLanguage;
  onComplete?: (results: GenericTrainingResultItem[]) => void;
  canTemporarilyDisable?: boolean;
  onTemporarilyDisable?: () => void;
  progress?: TrainingProgress;
}

export function ListeningTraining({
  items,
  userLanguage,
  onComplete,
  canTemporarilyDisable = false,
  onTemporarilyDisable,
  progress,
}: ListeningTrainingProps) {
  const { pop } = useNavigation();
  const [queue, setQueue] = useState<MixedTrainingItem[]>([...items]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const resultsRef = useRef<GenericTrainingResultItem[]>([]);
  const hasPlayedRef = useRef(false);

  const currentItem = queue[currentIndex];
  const payload = currentItem.payload as ListeningTrainingItem;

  useEffect(() => {
    if (!hasPlayedRef.current) {
      playAudio();
      hasPlayedRef.current = true;
    }
  }, [currentIndex, currentItem]);

  function playAudio() {
    playSpeech(payload.text, payload.speechUrl);
  }

  function isCorrectOption(option: ListeningOption): boolean {
    return option.learningItemId === payload.learningItemId;
  }

  function handleSelect(option: ListeningOption, index: number) {
    if (showResult) return;

    setSelectedOptionIndex(index);
    setShowResult(true);

    const correct = isCorrectOption(option);
    const resultItem: GenericTrainingResultItem = {
      question: {
        learningItemId: payload.learningItemId,
        definitionId: payload.definitions?.[0]?.id,
      },
      answers: correct ? [{ learningItemId: option.learningItemId }] : [],
      trainingType: TrainingType.LISTENING,
    };

    resultsRef.current = [...resultsRef.current, resultItem];
    if (!correct) {
      setQueue((prev) => [...prev, prev[currentIndex]]);
    }
  }

  async function handleNext() {
    if (currentIndex < queue.length - 1) {
      hasPlayedRef.current = false;
      setCurrentIndex(currentIndex + 1);
      setSelectedOptionIndex(null);
      setShowResult(false);
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
        trainingType: TrainingType.LISTENING,
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

  return (
    <List
      navigationTitle={`Listening (${(progress?.offset ?? 0) + currentIndex + 1}/${(progress?.total ?? items.length) + queue.length - items.length})`}
    >
      <List.Section title="Listen and select the correct word">
        {payload.options.map((option, index) => {
          const isSelected = selectedOptionIndex === index;
          const correct = isCorrectOption(option);

          let icon = Icon.Circle;
          let tintColor: Color | undefined;

          if (showResult) {
            if (correct) {
              icon = Icon.CheckCircle;
              tintColor = Color.Green;
            } else if (isSelected && !correct) {
              icon = Icon.XMarkCircle;
              tintColor = Color.Red;
            }
          }

          return (
            <List.Item
              key={index}
              icon={{ source: icon, tintColor }}
              title={`${index + 1}. ${option.text}`}
              actions={
                <ActionPanel>
                  {!showResult && (
                    <>
                      <Action title="Select" onAction={() => handleSelect(option, index)} />
                      {canTemporarilyDisable && onTemporarilyDisable && (
                        <Action
                          title="Can't Listen Right Now"
                          shortcut={{ modifiers: ["cmd"], key: "l" }}
                          onAction={onTemporarilyDisable}
                        />
                      )}
                      <Action
                        title="Replay Audio"
                        icon={Icon.SpeakerHigh}
                        shortcut={{ modifiers: [], key: "space" }}
                        onAction={playAudio}
                      />
                    </>
                  )}
                  {showResult && (
                    <>
                      <Action title={currentIndex < queue.length - 1 ? "Next" : "Finish"} onAction={handleNext} />
                      {canTemporarilyDisable && onTemporarilyDisable && (
                        <Action
                          title="Can't Listen Right Now"
                          shortcut={{ modifiers: ["cmd"], key: "l" }}
                          onAction={onTemporarilyDisable}
                        />
                      )}
                      <Action
                        title="Replay Audio"
                        icon={Icon.SpeakerHigh}
                        shortcut={{ modifiers: [], key: "space" }}
                        onAction={playAudio}
                      />
                    </>
                  )}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
