import { Action, ActionPanel, Detail, Icon, useNavigation } from "@raycast/api";
import { useState, useEffect, useCallback, useRef } from "react";
import { exec } from "child_process";
import { Exercise, categoryLabels, categoryIcons } from "../exercises";
import { addExerciseToHistory, CompletedExercise } from "../storage";

const PREPARATION_TIME = 10;

// macOS system sounds
const SOUND_START = "/System/Library/Sounds/Blow.aiff";
const SOUND_COMPLETE = "/System/Library/Sounds/Glass.aiff";

function playSound(soundPath: string) {
  exec(`afplay "${soundPath}"`);
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }
  return `${secs}s`;
}

type Phase = "ready" | "preparing" | "exercising" | "completed";

interface ExerciseSessionProps {
  exercise: Exercise;
  onComplete?: () => void;
  onAnotherExercise?: () => void;
  showAnotherButton?: boolean;
  autoStart?: boolean;
}

export function ExerciseSession({
  exercise,
  onComplete,
  onAnotherExercise,
  showAnotherButton = true,
  autoStart = false,
}: ExerciseSessionProps) {
  const { pop } = useNavigation();
  const [phase, setPhase] = useState<Phase>(autoStart ? "preparing" : "ready");
  const [prepTime, setPrepTime] = useState(PREPARATION_TIME);
  const [timeLeft, setTimeLeft] = useState(exercise.amount);
  const savedToHistory = useRef(false);

  const saveToHistory = useCallback(async () => {
    if (savedToHistory.current) return;
    savedToHistory.current = true;

    const completed: CompletedExercise = {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      category: exercise.category,
      completedAt: new Date().toISOString(),
      ...(exercise.type === "time"
        ? { duration: exercise.amount }
        : { reps: exercise.amount }),
    };
    await addExerciseToHistory(completed);
  }, [exercise]);

  const startExercise = useCallback(() => {
    setPhase("preparing");
    setPrepTime(PREPARATION_TIME);
  }, []);

  // Preparation countdown
  useEffect(() => {
    if (phase !== "preparing") return;

    if (prepTime <= 0) {
      playSound(SOUND_START);
      setPhase("exercising");
      setTimeLeft(exercise.amount);
      return;
    }

    const timer = setTimeout(() => {
      setPrepTime(prepTime - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [prepTime, phase, exercise.amount]);

  // Exercise countdown (for time-based exercises)
  useEffect(() => {
    if (phase !== "exercising" || exercise.type !== "time") return;

    if (timeLeft <= 0) {
      playSound(SOUND_COMPLETE);
      saveToHistory();
      setPhase("completed");
      onComplete?.();
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, phase, exercise.type, onComplete, saveToHistory]);

  const handleComplete = () => {
    playSound(SOUND_COMPLETE);
    saveToHistory();
    setPhase("completed");
    onComplete?.();
  };

  const categoryIcon = categoryIcons[exercise.category];
  const categoryLabel = categoryLabels[exercise.category];

  const amountText =
    exercise.type === "reps"
      ? `**${exercise.amount} reps**`
      : `**${formatTime(exercise.amount)}**`;

  // Build timer/status section
  let timerSection = "";

  if (phase === "ready") {
    timerSection = `\n\n---\n\n*Press "Start" when you're ready*`;
  } else if (phase === "preparing") {
    timerSection = `\n\n---\n\n# Get Ready!\n\n## ${prepTime}\n\n*Exercise starts in ${prepTime} second${prepTime !== 1 ? "s" : ""}...*`;
  } else if (phase === "exercising") {
    if (exercise.type === "time") {
      const progress = Math.round(
        ((exercise.amount - timeLeft) / exercise.amount) * 100,
      );
      const progressBar =
        "█".repeat(Math.floor(progress / 5)) +
        "░".repeat(20 - Math.floor(progress / 5));
      timerSection = `\n\n---\n\n# Time Remaining\n\n## ${formatTime(timeLeft)}\n\n\`${progressBar}\` ${progress}%`;
    } else {
      timerSection = `\n\n---\n\n# Let's Go!\n\nComplete **${exercise.amount} reps**\n\n*Press "Done" when finished*`;
    }
  } else if (phase === "completed") {
    timerSection = `\n\n---\n\n# Complete!\n\nGreat job! You finished the exercise.`;
  }

  const gifSection = exercise.gif
    ? `\n\n![${exercise.name}](${exercise.gif})\n`
    : "";

  const markdown = `
# ${categoryIcon} ${exercise.name}

**Category:** ${categoryLabel}

**Goal:** ${amountText}
${timerSection}
${gifSection}
---

## Description

${exercise.description}

---

## Tips

${exercise.tips.map((tip) => `- ${tip}`).join("\n")}
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          {phase === "ready" && (
            <Action title="Start" icon={Icon.Play} onAction={startExercise} />
          )}
          {phase === "exercising" && exercise.type === "reps" && (
            <Action
              title="Done"
              icon={Icon.CheckCircle}
              onAction={handleComplete}
            />
          )}
          {phase === "completed" && (
            <Action title="Back" icon={Icon.ArrowLeft} onAction={pop} />
          )}
          {showAnotherButton &&
            phase !== "preparing" &&
            phase !== "completed" &&
            onAnotherExercise && (
              <Action
                title="Another Exercise"
                icon={Icon.ArrowClockwise}
                onAction={onAnotherExercise}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
              />
            )}
          {phase === "ready" && (
            <Action
              title="Cancel"
              icon={Icon.XMarkCircle}
              onAction={pop}
              shortcut={{ modifiers: ["cmd"], key: "w" }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
