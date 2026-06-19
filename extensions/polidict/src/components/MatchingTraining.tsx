import { Action, ActionPanel, Color, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useRef, useState } from "react";
import type {
  GenericTrainingResult,
  GenericTrainingResultItem,
  MatchingDefinitionTrainingItem,
  MatchingLearningItemListening,
  MatchingLearningItemText,
  MatchingListeningTrainingItem,
  MixedTrainingItem,
  SupportedLanguage,
} from "../types";
import { TrainingType } from "../types";
import { createApiClient } from "../api";
import { formatDefinitionText, formatRaycastError, playSpeech } from "../utils";
import type { TrainingProgress } from "./MixedTrainingRouter";

interface MatchingTrainingProps {
  items: MixedTrainingItem[];
  userLanguage: SupportedLanguage;
  trainingType: TrainingType.MATCHING_LEARNING_ITEM_DEFINITION | TrainingType.MATCHING_LEARNING_ITEM_LISTENING;
  onComplete?: (results: GenericTrainingResultItem[]) => void;
  canTemporarilyDisable?: boolean;
  onTemporarilyDisable?: () => void;
  progress?: TrainingProgress;
}

interface UserPair {
  learningItemIndex: number;
  definitionIndex: number;
}

function getPayload(item: MixedTrainingItem): MatchingDefinitionTrainingItem | MatchingListeningTrainingItem | null {
  if (
    item.trainingType === TrainingType.MATCHING_LEARNING_ITEM_DEFINITION ||
    item.trainingType === TrainingType.MATCHING_LEARNING_ITEM_LISTENING
  ) {
    return item.payload;
  }
  return null;
}

export function MatchingTraining({
  items,
  userLanguage,
  trainingType,
  onComplete,
  canTemporarilyDisable = false,
  onTemporarilyDisable,
  progress,
}: MatchingTrainingProps) {
  const { pop } = useNavigation();
  const [queue, setQueue] = useState<MixedTrainingItem[]>([...items]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedLearningItem, setSelectedLearningItem] = useState<number | null>(null);
  const [userPairs, setUserPairs] = useState<UserPair[]>([]);
  const [showResult, setShowResult] = useState(false);
  const resultsRef = useRef<GenericTrainingResultItem[]>([]);

  const currentItem = queue[currentIndex];
  const isListening = trainingType === TrainingType.MATCHING_LEARNING_ITEM_LISTENING;

  const payload = getPayload(currentItem);
  if (!payload) return null;

  const { definitions, learningItems } = payload;

  const sortedDefinitions = [...definitions].sort((a, b) =>
    formatDefinitionText(a, "").localeCompare(formatDefinitionText(b, "")),
  );

  function selectLearningItem(index: number) {
    if (showResult) return;
    if (userPairs.some((p) => p.learningItemIndex === index)) return;
    setSelectedLearningItem(index);
    if (isListening) {
      playItemAudio(learningItems[index]);
    }
  }

  function selectDefinition(defIndex: number) {
    if (showResult || selectedLearningItem === null) return;
    if (userPairs.some((p) => p.definitionIndex === defIndex)) return;

    setUserPairs([...userPairs, { learningItemIndex: selectedLearningItem, definitionIndex: defIndex }]);
    setSelectedLearningItem(null);
  }

  function playItemAudio(item: MatchingLearningItemText | MatchingLearningItemListening) {
    const speechUrl = "speechUrl" in item ? (item as MatchingLearningItemListening).speechUrl : undefined;
    playSpeech(item.text, speechUrl);
  }

  function checkAnswers() {
    const correctResults: GenericTrainingResultItem[] = [];

    for (const userPair of userPairs) {
      const learningItem = learningItems[userPair.learningItemIndex];
      const selectedDef = sortedDefinitions[userPair.definitionIndex];
      const isCorrect = learningItem.learningItemId === selectedDef.learningItemId;

      correctResults.push({
        question: {
          learningItemId: learningItem.learningItemId,
          definitionId: selectedDef.definitionId,
        },
        answers: isCorrect ? [{ learningItemId: learningItem.learningItemId }] : [],
        trainingType,
      });
    }

    resultsRef.current = [...resultsRef.current, ...correctResults];
    const hasIncorrect = correctResults.some((r) => r.answers.length === 0);
    if (hasIncorrect) {
      setQueue((prev) => [...prev, prev[currentIndex]]);
    }
    setShowResult(true);
  }

  async function handleNext() {
    if (currentIndex < queue.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedLearningItem(null);
      setUserPairs([]);
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
        trainingType,
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

  function getLearningItemStatus(index: number): {
    icon: Icon;
    tintColor?: Color;
    matchedDef?: string;
  } {
    const pair = userPairs.find((p) => p.learningItemIndex === index);
    if (!pair) {
      if (selectedLearningItem === index) {
        return { icon: Icon.ArrowRight, tintColor: Color.Blue };
      }
      return { icon: Icon.Circle };
    }

    if (showResult) {
      const learningItem = learningItems[index];
      const selectedDef = sortedDefinitions[pair.definitionIndex];
      const isCorrect = learningItem.learningItemId === selectedDef.learningItemId;
      return {
        icon: isCorrect ? Icon.CheckCircle : Icon.XMarkCircle,
        tintColor: isCorrect ? Color.Green : Color.Red,
        matchedDef: formatDefinitionText(selectedDef, ""),
      };
    }

    return {
      icon: Icon.CheckCircle,
      tintColor: Color.Blue,
      matchedDef: formatDefinitionText(sortedDefinitions[pair.definitionIndex], ""),
    };
  }

  function getDefStatus(index: number): { icon: Icon; tintColor?: Color } {
    const pair = userPairs.find((p) => p.definitionIndex === index);
    if (!pair) {
      return { icon: Icon.Circle };
    }

    if (showResult) {
      const learningItem = learningItems[pair.learningItemIndex];
      const selectedDef = sortedDefinitions[index];
      const isCorrect = learningItem.learningItemId === selectedDef.learningItemId;
      return {
        icon: isCorrect ? Icon.CheckCircle : Icon.XMarkCircle,
        tintColor: isCorrect ? Color.Green : Color.Red,
      };
    }

    return { icon: Icon.CheckCircle, tintColor: Color.Blue };
  }

  const allMatched = userPairs.length === learningItems.length;
  const title = isListening ? "Matching (Audio)" : "Matching";

  function renderDisableAction() {
    if (!isListening || !canTemporarilyDisable || !onTemporarilyDisable) return null;
    return (
      <Action
        title="Can't Listen Right Now"
        shortcut={{ modifiers: ["cmd"], key: "l" }}
        onAction={onTemporarilyDisable}
      />
    );
  }

  return (
    <List
      navigationTitle={`${title} (${(progress?.offset ?? 0) + currentIndex + 1}/${(progress?.total ?? items.length) + queue.length - items.length})`}
    >
      <List.Section title={isListening ? "Words (press to play audio)" : "Words"}>
        {learningItems.map((item, index) => {
          const status = getLearningItemStatus(index);
          return (
            <List.Item
              key={`word-${index}`}
              icon={{ source: status.icon, tintColor: status.tintColor }}
              title={isListening ? `${index + 1}. (Audio)` : `${index + 1}. ${item.text}`}
              subtitle={status.matchedDef}
              accessories={isListening ? [{ icon: Icon.SpeakerHigh }] : undefined}
              actions={
                <ActionPanel>
                  {!showResult && (
                    <>
                      <Action title="Select" onAction={() => selectLearningItem(index)} />
                      {renderDisableAction()}
                      {isListening && (
                        <Action
                          title="Play Audio"
                          icon={Icon.SpeakerHigh}
                          shortcut={{ modifiers: [], key: "space" }}
                          onAction={() => playItemAudio(item)}
                        />
                      )}
                    </>
                  )}
                  {showResult && (
                    <>
                      <Action title={currentIndex < queue.length - 1 ? "Next" : "Finish"} onAction={handleNext} />
                      {renderDisableAction()}
                    </>
                  )}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      <List.Section title="Definitions">
        {sortedDefinitions.map((def, index) => {
          const status = getDefStatus(index);
          return (
            <List.Item
              key={`def-${index}`}
              icon={{ source: status.icon, tintColor: status.tintColor }}
              title={`${index + 1}. ${formatDefinitionText(def, "")}`}
              actions={
                <ActionPanel>
                  {!showResult && selectedLearningItem !== null && (
                    <Action title="Match" onAction={() => selectDefinition(index)} />
                  )}
                  {!showResult && renderDisableAction()}
                  {showResult && (
                    <Action title={currentIndex < queue.length - 1 ? "Next" : "Finish"} onAction={handleNext} />
                  )}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      {!showResult && allMatched && (
        <List.Section title="Actions">
          <List.Item
            icon={Icon.Check}
            title="Check Answers"
            actions={
              <ActionPanel>
                <Action title="Check" onAction={checkAnswers} />
                {renderDisableAction()}
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}
