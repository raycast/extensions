import { Action, ActionPanel, Detail } from "@raycast/api";
import { useState } from "react";
import type { FlashcardTrainingItem, GenericTrainingResultItem, MixedTrainingItem, SupportedLanguage } from "../types";
import { TrainingType } from "../types";
import { useTrainingSession } from "../hooks";
import { playSpeech } from "../utils";
import { formatDefinitionsMarkdown } from "./DefinitionsList";
import type { TrainingProgress } from "./MixedTrainingRouter";

interface FlashcardTrainingProps {
  items: MixedTrainingItem[];
  userLanguage: SupportedLanguage;
  onComplete?: (results: GenericTrainingResultItem[]) => void;
  progress?: TrainingProgress;
}

export function FlashcardTraining({
  items,
  userLanguage,
  onComplete,
  progress: outerProgress,
}: FlashcardTrainingProps) {
  const { currentItem, progress, addResult, handleNext, requeueCurrentItem } = useTrainingSession({
    items,
    userLanguage,
    trainingType: TrainingType.FLASHCARD,
    onComplete,
    progressOffset: outerProgress?.offset,
    progressTotal: outerProgress?.total,
  });

  const [isFlipped, setIsFlipped] = useState(false);

  const payload = currentItem.payload as FlashcardTrainingItem;

  async function handleKnow(knew: boolean) {
    const resultItem: GenericTrainingResultItem = {
      question: { learningItemId: payload.learningItemId },
      answers: knew ? [{ learningItemId: payload.learningItemId }] : [],
      trainingType: TrainingType.FLASHCARD,
    };

    addResult(resultItem);
    if (!knew) requeueCurrentItem();
    setIsFlipped(false);
    await handleNext();
  }

  const frontMarkdown = `# ${payload.text}\n\n${payload.comment ? `*${payload.comment}*` : ""}`;

  const backMarkdown = `# ${payload.text}\n\n${formatDefinitionsMarkdown(payload.definitions ?? [])}`;

  return (
    <Detail
      navigationTitle={`Flashcard (${progress.current}/${progress.total})`}
      markdown={isFlipped ? backMarkdown : frontMarkdown}
      actions={
        <ActionPanel>
          {!isFlipped ? (
            <Action
              title="Flip Card"
              onAction={() => {
                setIsFlipped(true);
                playSpeech(payload.text, payload.speechUrl);
              }}
            />
          ) : (
            <>
              <Action
                title="I Knew It"
                shortcut={{ modifiers: [], key: "arrowRight" }}
                onAction={() => handleKnow(true)}
              />
              <Action
                title="I Didn't Know"
                shortcut={{ modifiers: [], key: "arrowLeft" }}
                onAction={() => handleKnow(false)}
              />
            </>
          )}
        </ActionPanel>
      }
    />
  );
}
