import { Action, ActionPanel, Detail, Icon, useNavigation } from "@raycast/api";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Exercise,
  getRandomExercise,
  categoryLabels,
  categoryIcons,
} from "./exercises";
import { addExerciseToHistory, CompletedExercise } from "./storage";

const PREPARATION_TIME = 10;

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }
  return `${secs}s`;
}

type Phase = "ready" | "preparing" | "exercising" | "completed";

function ExerciseView({
  exercise,
  onComplete,
  onSkip,
  onNewExercise,
}: {
  exercise: Exercise;
  onComplete: () => void;
  onSkip: () => void;
  onNewExercise: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("ready");
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
      saveToHistory();
      setPhase("completed");
      onComplete();
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, phase, exercise.type, onComplete, saveToHistory]);

  const handleComplete = () => {
    saveToHistory();
    setPhase("completed");
    onComplete();
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

  const markdown = `
# ${categoryIcon} ${exercise.name}

**Category:** ${categoryLabel}

**Goal:** ${amountText}
${timerSection}

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
          {phase !== "preparing" && phase !== "completed" && (
            <Action
              title="Another Exercise"
              icon={Icon.ArrowClockwise}
              onAction={onNewExercise}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
          )}
          {phase === "ready" && (
            <Action
              title="Skip"
              icon={Icon.Forward}
              onAction={onSkip}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

function CompletedView({
  exercisesCompleted,
  onContinue,
  onFinish,
}: {
  exercisesCompleted: number;
  onContinue: () => void;
  onFinish: () => void;
}) {
  const markdown = `
# Exercise Complete!

You've completed **${exercisesCompleted}** exercise${exercisesCompleted > 1 ? "s" : ""} in this session.

---

Would you like to continue with another exercise or end the session?
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Continue with Another"
            icon={Icon.Play}
            onAction={onContinue}
          />
          <Action title="End Session" icon={Icon.Stop} onAction={onFinish} />
        </ActionPanel>
      }
    />
  );
}

function SummaryView({ exercisesCompleted }: { exercisesCompleted: number }) {
  const { pop } = useNavigation();

  const messages = [
    "Every movement counts!",
    "Your body thanks you!",
    "Consistency is key!",
    "Small steps, big results!",
    "Keep it up!",
  ];
  const randomMessage = messages[Math.floor(Math.random() * messages.length)];

  const markdown = `
# Session Complete!

## Summary

- **Exercises completed:** ${exercisesCompleted}

---

*${randomMessage}*

See you on the next break!
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Close" icon={Icon.XMarkCircle} onAction={pop} />
        </ActionPanel>
      }
    />
  );
}

export default function StartWorkout() {
  const [exercise, setExercise] = useState<Exercise>(getRandomExercise);
  const [exercisesCompleted, setExercisesCompleted] = useState(0);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [key, setKey] = useState(0);

  const handleComplete = () => {
    setExercisesCompleted((prev) => prev + 1);
    setShowCompleted(true);
  };

  const handleSkip = () => {
    setExercise(getRandomExercise());
    setKey((k) => k + 1);
  };

  const handleNewExercise = () => {
    setExercise(getRandomExercise());
    setShowCompleted(false);
    setKey((k) => k + 1);
  };

  const handleContinue = () => {
    setExercise(getRandomExercise());
    setShowCompleted(false);
    setKey((k) => k + 1);
  };

  const handleFinish = () => {
    setShowSummary(true);
  };

  if (showSummary) {
    return <SummaryView exercisesCompleted={exercisesCompleted} />;
  }

  if (showCompleted) {
    return (
      <CompletedView
        exercisesCompleted={exercisesCompleted}
        onContinue={handleContinue}
        onFinish={handleFinish}
      />
    );
  }

  return (
    <ExerciseView
      key={key}
      exercise={exercise}
      onComplete={handleComplete}
      onSkip={handleSkip}
      onNewExercise={handleNewExercise}
    />
  );
}
