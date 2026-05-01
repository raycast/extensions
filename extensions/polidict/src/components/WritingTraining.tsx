import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useRef, useState } from "react";
import type {
  GenericTrainingResult,
  GenericTrainingResultItem,
  MixedTrainingItem,
  SupportedLanguage,
  WritingTrainingItem,
} from "../types";
import { TrainingType } from "../types";
import { createApiClient } from "../api";
import { formatRaycastError } from "../utils";
import { playSpeech } from "../utils";
import type { TrainingProgress } from "./MixedTrainingRouter";

interface WritingTrainingProps {
  items: MixedTrainingItem[];
  userLanguage: SupportedLanguage;
  onComplete?: (results: GenericTrainingResultItem[]) => void;
  progress?: TrainingProgress;
}

export function WritingTraining({ items, userLanguage, onComplete, progress }: WritingTrainingProps) {
  const { pop } = useNavigation();
  const [queue, setQueue] = useState<MixedTrainingItem[]>([...items]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const resultsRef = useRef<GenericTrainingResultItem[]>([]);

  const currentItem = queue[currentIndex];
  const payload = currentItem.payload as WritingTrainingItem;

  function checkAnswer() {
    const normalizedInput = userInput.trim().toLowerCase();
    const normalizedAnswer = payload.text.trim().toLowerCase();
    const correct = normalizedInput === normalizedAnswer;

    setIsCorrect(correct);
    setShowResult(true);
    playSpeech(payload.text, payload.speechUrl);

    const resultItem: GenericTrainingResultItem = {
      question: {
        learningItemId: payload.learningItemId,
        definitionId: payload.definition?.id,
      },
      answers: correct ? [{ learningItemId: payload.learningItemId }] : [],
      trainingType: TrainingType.WRITING,
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
      trainingType: TrainingType.WRITING,
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
      setUserInput("");
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
        trainingType: TrainingType.WRITING,
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

  const defParts: string[] = [];
  if (payload.definition?.translation) defParts.push(`**Translation:** ${payload.definition.translation}`);
  if (payload.definition?.definition) defParts.push(`**Definition:** ${payload.definition.definition}`);
  if (!defParts.length) defParts.push(`**Definition:** —`);
  if (payload.comment) defParts.push(`*${payload.comment}*`);
  const definitionMarkdown = defParts.join("\n\n");

  return (
    <Form
      navigationTitle={`Writing (${(progress?.offset ?? 0) + currentIndex + 1}/${(progress?.total ?? items.length) + queue.length - items.length})`}
      actions={
        <ActionPanel>
          {!showResult ? (
            <>
              <Action.SubmitForm title="Submit" onSubmit={checkAnswer} />
              <Action
                title="Give up"
                icon={Icon.XMarkCircle}
                shortcut={{ modifiers: ["cmd"], key: "g" }}
                onAction={handleGiveUp}
              />
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
    >
      <Form.Description title="Definition" text={definitionMarkdown} />
      {showResult ? (
        <Form.Description title="Your Answer" text={userInput || "—"} />
      ) : (
        <Form.TextField
          id="answer"
          title="Your Answer"
          placeholder="Type the word..."
          value={userInput}
          onChange={setUserInput}
          autoFocus
        />
      )}
      {showResult && (
        <>
          <Form.Separator />
          <Form.Description title="Result" text={isCorrect ? "✓ Correct!" : `✗ Incorrect. Answer: ${payload.text}`} />
        </>
      )}
    </Form>
  );
}
