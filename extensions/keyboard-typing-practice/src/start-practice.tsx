import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getRandomPrompt } from "./prompts";
import { saveSession } from "./stats";

type ResultSummary = {
  wpm: number;
  accuracy: number;
  durationSec: number;
  correct: number;
  errors: number;
};

type LiveStats = {
  correct: number;
  errors: number;
};

function buildProgressBar(current: number, total: number, width = 24): string {
  if (total <= 0) {
    return `[${"-".repeat(width)}] 0/0`;
  }
  const ratio = Math.min(1, Math.max(0, current / total));
  const filled = Math.round(ratio * width);
  const empty = Math.max(0, width - filled);
  return `[${"#".repeat(filled)}${"-".repeat(empty)}] ${current}/${total}`;
}

function buildFocusWindow(prompt: string, index: number, windowSize = 20): string {
  const start = Math.max(0, index - windowSize);
  const end = Math.min(prompt.length, index + windowSize + 1);
  const before = prompt.slice(start, index);
  const current = prompt[index] ?? "";
  const after = prompt.slice(index + 1, end);
  const leftEllipsis = start > 0 ? "..." : "";
  const rightEllipsis = end < prompt.length ? "..." : "";
  const cursor = current === "" ? " " : current;
  return `${leftEllipsis}${before}[${cursor}]${after}${rightEllipsis}`;
}

function getLiveStats(prompt: string, typed: string): LiveStats {
  let correct = 0;
  let errors = 0;
  const minLength = Math.min(prompt.length, typed.length);

  for (let i = 0; i < minLength; i += 1) {
    if (typed[i] === prompt[i]) {
      correct += 1;
    } else {
      errors += 1;
    }
  }

  if (typed.length !== prompt.length) {
    errors += Math.abs(typed.length - prompt.length);
  }

  return {
    correct,
    errors,
  };
}

export default function StartPractice() {
  const [prompt, setPrompt] = useState(() => getRandomPrompt());
  const [input, setInput] = useState("");
  const [startTime, setStartTime] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<ResultSummary | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setStartTime(null);
    setIsSubmitting(false);
  }, [prompt]);

  useEffect(() => {
    if (input.length === 1 && startTime === null) {
      setStartTime(Date.now());
    }
  }, [input, startTime]);

  useEffect(() => {
    if (isSubmitting) {
      return;
    }
    if (prompt.length > 0 && input.length >= prompt.length) {
      setIsSubmitting(true);
      void handleSubmit({ typed: input });
    }
  }, [input, prompt.length, isSubmitting]);

  async function handleSubmit(values: { typed: string }) {
    setIsSubmitting(true);
    const typed = values.typed ?? "";
    const endTime = Date.now();
    const startedAt = startTime ?? endTime;
    const durationMs = Math.max(1000, endTime - startedAt);
    const minutes = durationMs / 60000;

    const { correct, errors } = getLiveStats(prompt, typed);

    const accuracy = correct + errors > 0 ? correct / (correct + errors) : 0;
    const wpm = minutes > 0 ? correct / 5 / minutes : 0;

    const session = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      prompt,
      inputLength: typed.length,
      correctChars: correct,
      errorChars: errors,
      durationMs,
      wpm,
      accuracy,
      timestamp: endTime,
    };

    await saveSession(session);

    const summary: ResultSummary = {
      wpm,
      accuracy,
      durationSec: durationMs / 1000,
      correct,
      errors,
    };
    setLastResult(summary);

    await showToast({
      style: Toast.Style.Success,
      title: "Session saved",
      message: `WPM ${wpm.toFixed(1)} - Accuracy ${(accuracy * 100).toFixed(1)}%`,
    });

    setInput("");
    setPrompt(getRandomPrompt(prompt));
    setStartTime(null);
    setIsSubmitting(false);
  }

  const resultLine = lastResult
    ? `${lastResult.wpm.toFixed(1)} WPM, ${(lastResult.accuracy * 100).toFixed(1)}% accuracy, ${lastResult.durationSec.toFixed(
        1,
      )}s, ${lastResult.errors} errors.`
    : "No runs yet. Type the prompt and submit to save your first session.";

  const liveStats = getLiveStats(prompt, input);
  const accuracySoFar =
    liveStats.correct + liveStats.errors > 0 ? (liveStats.correct / (liveStats.correct + liveStats.errors)) * 100 : 0;
  const elapsedMs = startTime ? Math.max(0, Date.now() - startTime) : 0;
  const elapsedMinutes = elapsedMs / 60000;
  const liveWpm = elapsedMinutes > 0 ? liveStats.correct / 5 / elapsedMinutes : 0;
  const progressBar = buildProgressBar(input.length, prompt.length);
  const focusWindow = buildFocusWindow(prompt, input.length);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Next Session" onSubmit={handleSubmit} />
          <Action
            title="New Prompt"
            onAction={() => {
              setInput("");
              setPrompt(getRandomPrompt(prompt));
              setStartTime(null);
            }}
          />
          <Action
            title="Retry Prompt"
            onAction={() => {
              setInput("");
              setStartTime(null);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Prompt" text={prompt} />
      <Form.Description title="Focus Window" text={focusWindow} />
      <Form.TextArea id="typed" title="Your Typing" value={input} onChange={setInput} autoFocus />
      <Form.Description title="Progress Bar" text={progressBar} />
      <Form.Description title="Live Accuracy" text={`${accuracySoFar.toFixed(1)}%`} />
      <Form.Description title="Live WPM" text={startTime ? liveWpm.toFixed(1) : "--"} />
      <Form.Description title="Last Result" text={resultLine} />
    </Form>
  );
}
