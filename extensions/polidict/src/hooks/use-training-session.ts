import { showToast, Toast, useNavigation } from "@raycast/api";
import { useRef, useState } from "react";
import type { GenericTrainingResult, GenericTrainingResultItem, MixedTrainingItem, SupportedLanguage } from "../types";
import { TrainingType } from "../types";
import { createApiClient } from "../api";
import { formatRaycastError } from "../utils";

interface UseTrainingSessionOptions {
  items: MixedTrainingItem[];
  userLanguage: SupportedLanguage;
  trainingType: TrainingType;
  onComplete?: (results: GenericTrainingResultItem[]) => void;
  progressOffset?: number;
  progressTotal?: number;
}

export function useTrainingSession({
  items,
  userLanguage,
  trainingType,
  onComplete,
  progressOffset = 0,
  progressTotal,
}: UseTrainingSessionOptions) {
  const { pop } = useNavigation();
  const [queue, setQueue] = useState<MixedTrainingItem[]>([...items]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const resultsRef = useRef<GenericTrainingResultItem[]>([]);

  const currentItem = queue[currentIndex];
  const isLastItem = currentIndex >= queue.length - 1;
  const requeuedCount = queue.length - items.length;
  const progress = {
    current: progressOffset + currentIndex + 1,
    total: (progressTotal ?? items.length) + requeuedCount,
  };

  function addResult(result: GenericTrainingResultItem) {
    resultsRef.current = [...resultsRef.current, result];
  }

  function addResults(results: GenericTrainingResultItem[]) {
    resultsRef.current = [...resultsRef.current, ...results];
  }

  function requeueCurrentItem() {
    setQueue((prev) => [...prev, prev[currentIndex]]);
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

  async function handleNext() {
    if (!isLastItem) {
      setCurrentIndex(currentIndex + 1);
      setShowResult(false);
    } else if (onComplete) {
      onComplete(resultsRef.current);
    } else {
      await submitResults();
    }
  }

  function resetForNextItem() {
    setShowResult(false);
  }

  return {
    currentItem,
    currentIndex,
    isLastItem,
    progress,
    showResult,
    setShowResult,
    addResult,
    addResults,
    handleNext,
    resetForNextItem,
    requeueCurrentItem,
    resultsRef,
    queue,
  };
}
