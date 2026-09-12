import { Action, ActionPanel, Color, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useRef, useState } from "react";
import type {
  GenericTrainingResult,
  GenericTrainingResultItem,
  MixedTrainingItem,
  QuizOption,
  QuizReverseOption,
  SupportedLanguage,
} from "../types";
import { TrainingType } from "../types";
import { createApiClient } from "../api";
import { formatDefinitionText, formatRaycastError } from "../utils";
import { playSpeech } from "../utils";
import type { TrainingProgress } from "./MixedTrainingRouter";

interface QuizTrainingProps {
  items: MixedTrainingItem[];
  userLanguage: SupportedLanguage;
  trainingType: TrainingType.QUIZ | TrainingType.QUIZ_REVERSE;
  onComplete?: (results: GenericTrainingResultItem[]) => void;
  progress?: TrainingProgress;
}

export function QuizTraining({ items, userLanguage, trainingType, onComplete, progress }: QuizTrainingProps) {
  const { pop } = useNavigation();
  const [queue, setQueue] = useState<MixedTrainingItem[]>([...items]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const resultsRef = useRef<GenericTrainingResultItem[]>([]);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  const currentItem = queue[currentIndex];
  const isQuiz = trainingType === TrainingType.QUIZ;

  let options: QuizOption[] | QuizReverseOption[];
  let questionText: string;
  let payloadLearningItemId: string;
  let reverseDefinitionId: string | undefined;

  if (currentItem.trainingType === TrainingType.QUIZ) {
    const { payload } = currentItem;
    options = payload.options;
    questionText = payload.text;
    payloadLearningItemId = payload.learningItemId;
    reverseDefinitionId = undefined;
  } else if (currentItem.trainingType === TrainingType.QUIZ_REVERSE) {
    const { payload } = currentItem;
    options = payload.options;
    questionText = formatDefinitionText(payload.definition);
    payloadLearningItemId = payload.learningItemId;
    reverseDefinitionId = payload.definition?.id;
  } else {
    return null;
  }

  function handleSelect(option: QuizOption | QuizReverseOption, index: number) {
    if (showResult) return;

    setSelectedOptionIndex(index);
    setShowResult(true);

    if (currentItem.trainingType === TrainingType.QUIZ) {
      playSpeech(currentItem.payload.text, currentItem.payload.speechUrl);
    } else if (currentItem.trainingType === TrainingType.QUIZ_REVERSE) {
      const correctOption = currentItem.payload.options.find((o) => o.answer);
      if (correctOption) {
        playSpeech(correctOption.text, correctOption.speechUrl);
      }
    }

    const resultItem: GenericTrainingResultItem = {
      question: {
        learningItemId: payloadLearningItemId,
        definitionId: reverseDefinitionId,
      },
      answers: option.answer ? [{ learningItemId: option.learningItemId }] : [],
      trainingType,
    };

    resultsRef.current = [...resultsRef.current, resultItem];
    if (!option.answer) {
      setQueue((prev) => [...prev, prev[currentIndex]]);
    }
  }

  async function handleNext() {
    if (currentIndex < queue.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOptionIndex(null);
      setShowResult(false);
    } else if (onComplete) {
      onComplete(resultsRef.current);
    } else {
      const allResults = resultsRef.current;
      try {
        const client = createApiClient();
        const result: GenericTrainingResult = {
          items: allResults,
          trainingType,
        };
        await client.trainings.submitTrainingResult(userLanguage, result);

        const correct = allResults.filter((r) => r.answers.length > 0).length;
        showToast({
          style: Toast.Style.Success,
          title: "Training complete!",
          message: `Score: ${correct}/${allResults.length}`,
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
  }

  return (
    <List
      navigationTitle={`${isQuiz ? "Quiz" : "Quiz Reverse"} (${(progress?.offset ?? 0) + currentIndex + 1}/${(progress?.total ?? items.length) + queue.length - items.length})`}
    >
      <List.Section title={questionText}>
        {options.map((option, index) => {
          const isSelected = selectedOptionIndex === index;
          const isCorrect = option.answer;

          let icon = Icon.Circle;
          let tintColor: Color | undefined;

          if (showResult) {
            if (isCorrect) {
              icon = Icon.CheckCircle;
              tintColor = Color.Green;
            } else if (isSelected && !isCorrect) {
              icon = Icon.XMarkCircle;
              tintColor = Color.Red;
            }
          }

          const optionText = "definition" in option ? formatDefinitionText(option.definition) : option.text;

          return (
            <List.Item
              key={index}
              icon={{ source: icon, tintColor }}
              title={optionText}
              actions={
                <ActionPanel>
                  {!showResult && <Action title="Select" onAction={() => handleSelect(option, index)} />}
                  {showResult && (
                    <Action title={currentIndex < queue.length - 1 ? "Next" : "Finish"} onAction={handleNext} />
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
