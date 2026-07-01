import { Action, ActionPanel, Detail, showToast, Toast, useNavigation } from "@raycast/api";
import type { ChildProcess } from "child_process";
import { exec, execFile } from "child_process";
import { promisify } from "util";
import { useEffect, useRef, useState } from "react";
import type {
  GenericTrainingResult,
  GenericTrainingResultItem,
  MixedTrainingItem,
  SpeakingTrainingItem,
  SupportedLanguage,
} from "../types";
import { TrainingType } from "../types";
import { createApiClient } from "../api";
import { formatRaycastError, playSpeech } from "../utils";
import type { TrainingProgress } from "./MixedTrainingRouter";

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

const RECORDING_PATH = "/tmp/polidict-speech-input.wav";

type RecordingState = "idle" | "recording" | "transcribing" | "recorded";

interface TranscriptionResult {
  text: string;
  isMatch: boolean;
  similarity: number;
}

function normalizeForComparison(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:'"]/g, "")
    .replace(/\s+/g, " ");
}

function calculateSimilarity(a: string, b: string): number {
  const normalA = normalizeForComparison(a);
  const normalB = normalizeForComparison(b);

  if (normalA === normalB) return 1;
  if (normalA.includes(normalB) || normalB.includes(normalA)) return 0.9;

  const longer = normalA.length > normalB.length ? normalA : normalB;

  if (longer.length === 0) return 1;

  const editDistance = levenshteinDistance(normalA, normalB);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
      }
    }
  }

  return matrix[b.length][a.length];
}

interface SpeakingTrainingProps {
  items: MixedTrainingItem[];
  userLanguage: SupportedLanguage;
  onComplete?: (results: GenericTrainingResultItem[]) => void;
  canTemporarilyDisable?: boolean;
  onTemporarilyDisable?: () => void;
  progress?: TrainingProgress;
}

export function SpeakingTraining({
  items,
  userLanguage,
  onComplete,
  canTemporarilyDisable = false,
  onTemporarilyDisable,
  progress,
}: SpeakingTrainingProps) {
  const { pop } = useNavigation();
  const [queue, setQueue] = useState<MixedTrainingItem[]>([...items]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [transcription, setTranscription] = useState<TranscriptionResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const resultsRef = useRef<GenericTrainingResultItem[]>([]);
  const recordingProcessRef = useRef<ChildProcess | null>(null);

  useEffect(() => {
    return () => {
      if (recordingProcessRef.current) {
        recordingProcessRef.current.kill();
      }
    };
  }, []);

  const currentItem = queue[currentIndex];
  const payload = currentItem.payload as SpeakingTrainingItem;

  function playTargetAudio() {
    playSpeech(payload.text, payload.speechUrl);
  }

  function startRecording() {
    setRecordingState("recording");
    setTranscription(null);
    recordingProcessRef.current = execFile("rec", [RECORDING_PATH, "rate", "16k"], (error) => {
      if (error && !error.killed) {
        showToast({
          style: Toast.Style.Failure,
          title: "Recording failed",
          message: "Make sure sox is installed: brew install sox",
        });
        setRecordingState("idle");
      }
    });
  }

  async function stopRecording() {
    if (recordingProcessRef.current) {
      recordingProcessRef.current.kill();
      recordingProcessRef.current = null;
    }

    setRecordingState("transcribing");
    execFile("afplay", [RECORDING_PATH]);

    const result = await transcribeAudio();
    setTranscription(result);
    setRecordingState("recorded");
  }

  async function transcribeAudio(): Promise<TranscriptionResult | null> {
    try {
      // Try whisper-cpp (Homebrew installation)
      const modelPaths = [
        "/opt/homebrew/share/whisper-cpp/models/ggml-tiny.bin",
        "/usr/local/share/whisper-cpp/models/ggml-tiny.bin",
      ];

      let modelPath: string | null = null;
      for (const path of modelPaths) {
        try {
          await execAsync(`test -f "${path}"`);
          modelPath = path;
          break;
        } catch {
          // Model not found at this path
        }
      }

      if (!modelPath) {
        return null;
      }

      const { stdout } = await execFileAsync("whisper-cpp", [
        "--model",
        modelPath,
        "--language",
        userLanguage.languageCode,
        "--file",
        RECORDING_PATH,
      ]);

      const transcribedText = stdout
        .split("\n")
        .filter((line) => line.includes("]"))
        .map((line) => line.replace(/^\[[^\]]+\]\s*/, "").trim())
        .join(" ")
        .trim();

      if (transcribedText) {
        const similarity = calculateSimilarity(transcribedText, payload.text);
        return {
          text: transcribedText,
          isMatch: similarity >= 0.7,
          similarity,
        };
      }
    } catch {
      // whisper-cpp not available, fall back to manual grading
    }

    return null;
  }

  function playRecording() {
    execFile("afplay", [RECORDING_PATH]);
  }

  function handleGrade(correct: boolean) {
    setShowResult(true);

    const resultItem: GenericTrainingResultItem = {
      question: {
        learningItemId: payload.learningItemId,
        definitionId: payload.definitions?.[0]?.id,
      },
      answers: correct ? [{ learningItemId: payload.learningItemId }] : [],
      trainingType: TrainingType.SPEAKING,
    };

    resultsRef.current = [...resultsRef.current, resultItem];
    if (!correct) {
      setQueue((prev) => [...prev, prev[currentIndex]]);
    }

    handleNext();
  }

  async function handleNext() {
    if (currentIndex < queue.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setRecordingState("idle");
      setTranscription(null);
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
        trainingType: TrainingType.SPEAKING,
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

  const firstDef = payload.definitions?.[0];
  const defParts = [`# Say this word\n\n**Word:** ${payload.text}`];
  if (firstDef?.translation) defParts.push(`**Translation:** ${firstDef.translation}`);
  if (firstDef?.definition) defParts.push(`**Definition:** ${firstDef.definition}`);
  if (!firstDef?.translation && !firstDef?.definition) defParts.push(`**Definition:** —`);
  if (payload.comment) defParts.push(`*${payload.comment}*`);
  const definitionMarkdown = defParts.join("\n\n");

  let stateMessage = "";
  if (recordingState === "idle") {
    stateMessage = "\n\n---\n\nPress **Space** to start recording";
  } else if (recordingState === "recording") {
    stateMessage = "\n\n---\n\n🔴 **Recording...** Press **Space** to stop";
  } else if (recordingState === "transcribing") {
    stateMessage = "\n\n---\n\n⏳ **Transcribing...**";
  } else if (recordingState === "recorded") {
    if (transcription) {
      const matchIcon = transcription.isMatch ? "✓" : "✗";
      const matchText = transcription.isMatch ? "Match!" : "No match";
      const percentage = Math.round(transcription.similarity * 100);
      stateMessage = `\n\n---\n\n${matchIcon} **${matchText}** (${percentage}% similar)\n\n**You said:** "${transcription.text}"\n\n**Expected:** "${payload.text}"`;
    } else {
      stateMessage =
        "\n\n---\n\n✓ **Recorded!** Rate your pronunciation\n\n*(Install whisper-cpp for automatic transcription: brew install whisper-cpp)*";
    }
  }

  return (
    <Detail
      navigationTitle={`Speaking (${(progress?.offset ?? 0) + currentIndex + 1}/${(progress?.total ?? items.length) + queue.length - items.length})`}
      markdown={definitionMarkdown + stateMessage}
      actions={
        <ActionPanel>
          {recordingState === "idle" && (
            <>
              <Action title="Start Recording" shortcut={{ modifiers: [], key: "space" }} onAction={startRecording} />
              {canTemporarilyDisable && onTemporarilyDisable && (
                <Action
                  title="Can't Speak Right Now"
                  shortcut={{ modifiers: ["cmd"], key: "k" }}
                  onAction={onTemporarilyDisable}
                />
              )}
              <Action title="Play Target Audio" shortcut={{ modifiers: [], key: "r" }} onAction={playTargetAudio} />
            </>
          )}
          {recordingState === "recording" && (
            <>
              <Action title="Stop Recording" shortcut={{ modifiers: [], key: "space" }} onAction={stopRecording} />
              {canTemporarilyDisable && onTemporarilyDisable && (
                <Action
                  title="Can't Speak Right Now"
                  shortcut={{ modifiers: ["cmd"], key: "k" }}
                  onAction={onTemporarilyDisable}
                />
              )}
            </>
          )}
          {recordingState === "recorded" && !showResult && (
            <>
              {transcription?.isMatch ? (
                <Action
                  title="Accept as Correct"
                  shortcut={{ modifiers: [], key: "return" }}
                  onAction={() => handleGrade(true)}
                />
              ) : (
                <Action
                  title="Accept as Incorrect"
                  shortcut={{ modifiers: [], key: "return" }}
                  onAction={() => handleGrade(transcription?.isMatch ?? false)}
                />
              )}
              <Action
                title="Override: Correct"
                shortcut={{ modifiers: ["cmd"], key: "return" }}
                onAction={() => handleGrade(true)}
              />
              <Action
                title="Override: Incorrect"
                shortcut={{ modifiers: [], key: "backspace" }}
                onAction={() => handleGrade(false)}
              />
              <Action title="Play My Recording" shortcut={{ modifiers: [], key: "p" }} onAction={playRecording} />
              <Action title="Play Target Audio" shortcut={{ modifiers: [], key: "r" }} onAction={playTargetAudio} />
              <Action
                title="Try Again"
                shortcut={{ modifiers: [], key: "t" }}
                onAction={() => {
                  setRecordingState("idle");
                  setTranscription(null);
                }}
              />
              {canTemporarilyDisable && onTemporarilyDisable && (
                <Action
                  title="Can't Speak Right Now"
                  shortcut={{ modifiers: ["cmd"], key: "k" }}
                  onAction={onTemporarilyDisable}
                />
              )}
            </>
          )}
        </ActionPanel>
      }
    />
  );
}
