import { confirmAlert, List, showToast, Toast, useNavigation } from "@raycast/api";
import React, { useRef, useState } from "react";
import type { GenericTrainingResult, GenericTrainingResultItem, MixedTrainingItem, SupportedLanguage } from "../types";
import { TrainingType } from "../types";
import { createApiClient } from "../api";
import { formatRaycastError } from "../utils";
import { QuizTraining } from "./QuizTraining";
import { FlashcardTraining } from "./FlashcardTraining";
import { WritingTraining } from "./WritingTraining";
import { WritingSelectionTraining } from "./WritingSelectionTraining";
import { ListeningTraining } from "./ListeningTraining";
import { SpeakingTraining } from "./SpeakingTraining";
import { MatchingTraining } from "./MatchingTraining";
import { TrainingErrorBoundary } from "./TrainingErrorBoundary";
import {
  applyTemporaryDisableCooldown,
  addTemporaryDisabledTypes,
  canTemporarilyDisableKind,
  getActiveTemporarilyDisabledTypes,
  type TemporaryDisableKind,
  type TemporaryDisableState,
  isTrainingTypeTemporarilyDisabled,
} from "./temporary-disable";
import { saveTemporaryDisableState } from "./temporary-disable-storage";

interface MixedTrainingRouterProps {
  items: MixedTrainingItem[];
  userLanguage: SupportedLanguage;
  initialTemporaryDisableState?: TemporaryDisableState;
}

export interface TrainingProgress {
  offset: number;
  total: number;
}

interface TrainingBatch {
  trainingType: TrainingType;
  items: MixedTrainingItem[];
  offset: number;
}

function groupIntoBatches(items: MixedTrainingItem[]): TrainingBatch[] {
  const batches: TrainingBatch[] = [];
  let offset = 0;
  for (const item of items) {
    const lastBatch = batches[batches.length - 1];
    if (lastBatch && lastBatch.trainingType === item.trainingType) {
      lastBatch.items.push(item);
    } else {
      batches.push({
        trainingType: item.trainingType,
        items: [item],
        offset,
      });
    }
    offset++;
  }
  return batches;
}

function assertNever(x: never): never {
  throw new Error(`Unexpected training type: ${x}`);
}

function renderBatch(
  batch: TrainingBatch,
  totalItems: number,
  userLanguage: SupportedLanguage,
  onComplete: (results: GenericTrainingResultItem[]) => void,
  canTemporarilyDisableListening: boolean,
  canTemporarilyDisableSpeaking: boolean,
  onTemporarilyDisable: (kind: TemporaryDisableKind) => void,
): React.ReactElement {
  const progress: TrainingProgress = {
    offset: batch.offset,
    total: totalItems,
  };

  switch (batch.trainingType) {
    case TrainingType.QUIZ:
      return (
        <QuizTraining
          items={batch.items}
          userLanguage={userLanguage}
          trainingType={TrainingType.QUIZ}
          onComplete={onComplete}
          progress={progress}
        />
      );

    case TrainingType.QUIZ_REVERSE:
      return (
        <QuizTraining
          items={batch.items}
          userLanguage={userLanguage}
          trainingType={TrainingType.QUIZ_REVERSE}
          onComplete={onComplete}
          progress={progress}
        />
      );

    case TrainingType.FLASHCARD:
      return (
        <FlashcardTraining
          items={batch.items}
          userLanguage={userLanguage}
          onComplete={onComplete}
          progress={progress}
        />
      );

    case TrainingType.WRITING:
      return (
        <WritingTraining items={batch.items} userLanguage={userLanguage} onComplete={onComplete} progress={progress} />
      );

    case TrainingType.WRITING_SELECTION:
      return (
        <WritingSelectionTraining
          items={batch.items}
          userLanguage={userLanguage}
          onComplete={onComplete}
          progress={progress}
        />
      );

    case TrainingType.LISTENING:
      return (
        <ListeningTraining
          items={batch.items}
          userLanguage={userLanguage}
          onComplete={onComplete}
          canTemporarilyDisable={canTemporarilyDisableListening}
          onTemporarilyDisable={() => onTemporarilyDisable("listening")}
          progress={progress}
        />
      );

    case TrainingType.SPEAKING:
      return (
        <SpeakingTraining
          items={batch.items}
          userLanguage={userLanguage}
          onComplete={onComplete}
          canTemporarilyDisable={canTemporarilyDisableSpeaking}
          onTemporarilyDisable={() => onTemporarilyDisable("speaking")}
          progress={progress}
        />
      );

    case TrainingType.MATCHING_LEARNING_ITEM_DEFINITION:
      return (
        <MatchingTraining
          items={batch.items}
          userLanguage={userLanguage}
          trainingType={TrainingType.MATCHING_LEARNING_ITEM_DEFINITION}
          onComplete={onComplete}
          progress={progress}
        />
      );

    case TrainingType.MATCHING_LEARNING_ITEM_LISTENING:
      return (
        <MatchingTraining
          items={batch.items}
          userLanguage={userLanguage}
          trainingType={TrainingType.MATCHING_LEARNING_ITEM_LISTENING}
          onComplete={onComplete}
          canTemporarilyDisable={canTemporarilyDisableListening}
          onTemporarilyDisable={() => onTemporarilyDisable("listening")}
          progress={progress}
        />
      );

    default:
      return assertNever(batch.trainingType);
  }
}

function TrainingComponent({
  items,
  userLanguage,
  initialTemporaryDisableState = {},
}: MixedTrainingRouterProps): React.ReactElement | null {
  const { pop } = useNavigation();
  const [batchIndex, setBatchIndex] = useState(0);
  const [temporarilyDisabledTypes, setTemporarilyDisabledTypes] = useState<Set<TrainingType>>(() =>
    getActiveTemporarilyDisabledTypes(initialTemporaryDisableState),
  );
  const [temporaryDisableState, setTemporaryDisableState] =
    useState<TemporaryDisableState>(initialTemporaryDisableState);
  const allResultsRef = useRef<GenericTrainingResultItem[]>([]);

  if (items.length === 0) {
    return (
      <List>
        <List.EmptyView title="No training items" />
      </List>
    );
  }

  const batches = groupIntoBatches(items);
  const availableTrainingTypes = Array.from(new Set(batches.map((batch) => batch.trainingType)));
  const canTemporarilyDisableListening = canTemporarilyDisableKind(
    availableTrainingTypes,
    temporarilyDisabledTypes,
    "listening",
  );
  const canTemporarilyDisableSpeaking = canTemporarilyDisableKind(
    availableTrainingTypes,
    temporarilyDisabledTypes,
    "speaking",
  );

  function getNextEnabledBatchIndex(startIndex: number, disabledTypes: Set<TrainingType>): number {
    for (let index = startIndex; index < batches.length; index++) {
      if (!isTrainingTypeTemporarilyDisabled(batches[index].trainingType, disabledTypes)) {
        return index;
      }
    }
    return -1;
  }

  function handleBatchComplete(batchResults: GenericTrainingResultItem[]) {
    allResultsRef.current = [...allResultsRef.current, ...batchResults];

    const nextBatchIndex = getNextEnabledBatchIndex(batchIndex + 1, temporarilyDisabledTypes);

    if (nextBatchIndex !== -1) {
      setBatchIndex(nextBatchIndex);
    } else {
      submitAllResults();
    }
  }

  function handleTemporarilyDisable(kind: TemporaryDisableKind) {
    void confirmAndDisableTemporarily(kind);
  }

  async function confirmAndDisableTemporarily(kind: TemporaryDisableKind) {
    const confirmed = await confirmAlert({
      title: kind === "speaking" ? "Can't speak right now?" : "Can't listen right now?",
      message: kind === "speaking" ? "We'll skip speaking for 15 minutes." : "We'll skip listening for 15 minutes.",
      primaryAction: {
        title: "Continue",
      },
    });

    if (!confirmed) {
      return;
    }

    const nextDisabledTypes = addTemporaryDisabledTypes(temporarilyDisabledTypes, kind);
    const nextTemporaryDisableState = applyTemporaryDisableCooldown(temporaryDisableState, kind);

    setTemporarilyDisabledTypes(nextDisabledTypes);
    setTemporaryDisableState(nextTemporaryDisableState);
    void saveTemporaryDisableState(userLanguage.languageCode, nextTemporaryDisableState);

    const nextBatchIndex = getNextEnabledBatchIndex(batchIndex + 1, nextDisabledTypes);

    if (nextBatchIndex !== -1) {
      setBatchIndex(nextBatchIndex);
      return;
    }

    submitAllResults();
  }

  async function submitAllResults() {
    try {
      const client = createApiClient();
      const result: GenericTrainingResult = {
        items: allResultsRef.current,
      };
      await client.trainings.submitTrainingResult(userLanguage, result);

      const correct = allResultsRef.current.filter((r) => r.answers.length > 0).length;
      showToast({
        style: Toast.Style.Success,
        title: "Training complete!",
        message: `Score: ${correct}/${allResultsRef.current.length}`,
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

  const currentBatch = batches[batchIndex];

  if (!currentBatch) {
    return null;
  }

  // key forces remount when batch changes so component state resets
  return (
    <React.Fragment key={batchIndex}>
      {renderBatch(
        currentBatch,
        items.length,
        userLanguage,
        handleBatchComplete,
        canTemporarilyDisableListening,
        canTemporarilyDisableSpeaking,
        handleTemporarilyDisable,
      )}
    </React.Fragment>
  );
}

export function MixedTrainingRouter(props: MixedTrainingRouterProps) {
  return (
    <TrainingErrorBoundary>
      <TrainingComponent {...props} />
    </TrainingErrorBoundary>
  );
}
