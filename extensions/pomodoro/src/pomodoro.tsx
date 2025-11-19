import { Detail, Action, ActionPanel, LocalStorage, showHUD, LaunchProps, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";

interface Preferences {
  pomodoroDuration: string;
  shortBreakDuration: string;
  longBreakDuration: string;
  autoStartBreaks: boolean;
  longBreakInterval: string;
  enableBackgroundMode: boolean;
}

// Parse duration string like "25m", "1h", "90s" to seconds
function parseDuration(input: string): number | null {
  if (!input || input.trim() === "") return null;

  const match = input.trim().match(/^(\d+)(s|m|h)?$/i);
  if (!match) return null;

  const value = parseInt(match[1]);
  const unit = (match[2] || "m").toLowerCase();

  let seconds: number;
  switch (unit) {
    case "s":
      seconds = value;
      break;
    case "m":
      seconds = value * 60;
      break;
    case "h":
      seconds = value * 3600;
      break;
    default:
      seconds = value * 60;
  }

  // Validate: minimum 10 seconds, maximum 4 hours (14400s)
  if (seconds < 10 || seconds > 14400) return null;

  return seconds;
}

// Get timer durations from preferences
function getPreferenceDurations() {
  const prefs = getPreferenceValues<Preferences>();
  return {
    pomodoro: parseDuration(prefs.pomodoroDuration) || 25 * 60,
    shortBreak: parseDuration(prefs.shortBreakDuration) || 5 * 60,
    longBreak: parseDuration(prefs.longBreakDuration) || 15 * 60,
    autoStartBreaks: prefs.autoStartBreaks || false,
    longBreakInterval: parseInt(prefs.longBreakInterval) || 4,
    enableBackgroundMode: prefs.enableBackgroundMode || false,
  };
}

// Default fallbacks are provided via preferences helper; no fixed constants needed

type TimerMode = "pomodoro" | "shortBreak" | "longBreak";
type TimerState = "idle" | "running" | "paused" | "complete";

interface Stats {
  completedPomodoros: number;
  totalFocusTime: number;
  currentStreak: number;
  todayPomodoros: number;
  lastCompletedDate: string;
}

interface Arguments {
  duration?: string;
}

const STORAGE_KEYS = {
  STATS: "pomodoro-stats",
  TIMER_STATE: "pomodoro-timer-state",
};

export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const prefs = getPreferenceDurations();
  const customDuration = parseDuration(props.arguments.duration || "");
  const initialDuration = customDuration || prefs.pomodoro;

  const [timeLeft, setTimeLeft] = useState(initialDuration);
  const [timerMode, setTimerMode] = useState<TimerMode>("pomodoro");
  const [timerState, setTimerState] = useState<TimerState>("idle");
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [customTimerDuration, setCustomTimerDuration] = useState<number>(initialDuration);
  const [stats, setStats] = useState<Stats>({
    completedPomodoros: 0,
    totalFocusTime: 0,
    currentStreak: 0,
    todayPomodoros: 0,
    lastCompletedDate: new Date().toDateString(),
  });

  // Load saved state and stats on mount
  useEffect(() => {
    loadState();
    loadStats();
  }, []);

  // Save state periodically
  useEffect(() => {
    if (timerState === "running") {
      saveState();
    }
  }, [timeLeft, timerState, timerMode]);

  // Accurate timer using timestamp calculation
  useEffect(() => {
    if (timerState !== "running" || timeLeft <= 0) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const prefs = getPreferenceDurations();
      const duration =
        timerMode === "pomodoro" && customTimerDuration !== prefs.pomodoro
          ? customTimerDuration
          : getDuration(timerMode);
      const newTimeLeft = Math.max(0, duration - elapsed);
      setTimeLeft(newTimeLeft);
      if (newTimeLeft <= 0) {
        handleTimerComplete();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [timerState, startTime, timerMode, customTimerDuration]);

  const loadState = async () => {
    try {
      // Always try to load saved state first
      const saved = await LocalStorage.getItem<string>(STORAGE_KEYS.TIMER_STATE);
      if (saved) {
        const state = JSON.parse(saved);

        // If there's a saved running timer, restore it
        if (state.timerState === "running" || state.timerState === "paused") {
          const savedTime = state.startTime || Date.now();
          const elapsed = Math.floor((Date.now() - savedTime) / 1000);
          const savedDuration = state.customTimerDuration || getDuration(state.timerMode || "pomodoro");
          const calculatedTimeLeft = Math.max(0, savedDuration - elapsed);

          if (calculatedTimeLeft > 0) {
            setTimeLeft(calculatedTimeLeft);
            setTimerMode(state.timerMode || "pomodoro");
            setTimerState(state.timerState);
            setStartTime(savedTime);
            setCustomTimerDuration(savedDuration);
            return; // Exit early - we restored the saved timer
          }
        }
      }

      // If we have a custom duration from arguments, use that
      if (customDuration) {
        setCustomTimerDuration(customDuration);
        setTimeLeft(customDuration);
        setTimerState("running");
        setStartTime(Date.now());
      }
    } catch (error) {
      console.error("Failed to load timer state:", error);
      // Clear corrupted data
      await LocalStorage.removeItem(STORAGE_KEYS.TIMER_STATE);
    }
  };

  const saveState = async () => {
    try {
      await LocalStorage.setItem(
        STORAGE_KEYS.TIMER_STATE,
        JSON.stringify({
          timeLeft,
          timerMode,
          timerState,
          startTime,
          customTimerDuration,
        }),
      );
    } catch (error) {
      console.error("Failed to save timer state:", error);
    }
  };

  const loadStats = async () => {
    try {
      const saved = await LocalStorage.getItem<string>(STORAGE_KEYS.STATS);
      if (saved) {
        const loadedStats = JSON.parse(saved);
        const today = new Date().toDateString();

        // Reset daily stats if it's a new day
        if (loadedStats.lastCompletedDate !== today) {
          loadedStats.todayPomodoros = 0;
          loadedStats.lastCompletedDate = today;
        }

        setStats(loadedStats);
      }
    } catch (error) {
      console.error("Failed to load stats:", error);
      // Clear corrupted data
      await LocalStorage.removeItem(STORAGE_KEYS.STATS);
    }
  };

  const saveStats = async (newStats: Stats) => {
    try {
      await LocalStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(newStats));
      setStats(newStats);
    } catch (error) {
      console.error("Failed to save stats:", error);
    }
  };

  const getDuration = (mode: TimerMode): number => {
    const prefs = getPreferenceDurations();
    switch (mode) {
      case "pomodoro":
        return prefs.pomodoro;
      case "shortBreak":
        return prefs.shortBreak;
      case "longBreak":
        return prefs.longBreak;
    }
  };

  const handleTimerComplete = async () => {
    setTimerState("complete");

    // Clear saved state when timer completes
    await LocalStorage.removeItem(STORAGE_KEYS.TIMER_STATE);

    // Update stats if pomodoro completed
    if (timerMode === "pomodoro") {
      const today = new Date().toDateString();
      const newStats: Stats = {
        completedPomodoros: stats.completedPomodoros + 1,
        totalFocusTime: stats.totalFocusTime + customTimerDuration,
        currentStreak: stats.lastCompletedDate === today ? stats.currentStreak + 1 : 1,
        todayPomodoros: stats.todayPomodoros + 1,
        lastCompletedDate: today,
      };
      await saveStats(newStats);

      // Check if we should suggest long break
      const prefs = getPreferenceDurations();
      const shouldSuggestLongBreak = newStats.completedPomodoros % prefs.longBreakInterval === 0;

      // HUD-only notification (sound removed)
      if (shouldSuggestLongBreak) {
        await showHUD("🎉 Pomodoro done! LONG BREAK suggested 🌴");
      } else {
        await showHUD("🎉 Pomodoro done! Time for a short break ☕");
      }
    } else {
      await showHUD("✅ Break complete! Ready for another pomodoro?");
    }

    // Auto-start breaks if enabled
    const prefs = getPreferenceDurations();
    if (prefs.autoStartBreaks && timerMode === "pomodoro") {
      const shouldStartLongBreak = stats.completedPomodoros % prefs.longBreakInterval === 0;
      setTimeout(() => {
        if (shouldStartLongBreak) {
          handleStartLongBreak();
        } else {
          handleStartShortBreak();
        }
      }, 2000);
    }
  };

  const handlePause = () => {
    setTimerState("paused");
    saveState();
  };

  const handleResume = () => {
    const prefs = getPreferenceDurations();
    const duration =
      timerMode === "pomodoro" && customTimerDuration !== prefs.pomodoro ? customTimerDuration : getDuration(timerMode);
    setStartTime(Date.now() - (duration - timeLeft) * 1000);
    setTimerState("running");
  };

  const handleReset = () => {
    const prefs = getPreferenceDurations();
    const duration =
      timerMode === "pomodoro" && customTimerDuration !== prefs.pomodoro ? customTimerDuration : getDuration(timerMode);
    setTimeLeft(duration);
    setTimerState("idle");
    setStartTime(Date.now());
    saveState();
  };

  const handleStartPomodoro = () => {
    const prefs = getPreferenceDurations();
    setTimerMode("pomodoro");
    const duration = customTimerDuration !== prefs.pomodoro ? customTimerDuration : prefs.pomodoro;
    setTimeLeft(duration);
    setTimerState("running");
    setStartTime(Date.now());
  };

  const handleStartShortBreak = () => {
    const prefs = getPreferenceDurations();
    setTimerMode("shortBreak");
    setTimeLeft(prefs.shortBreak);
    setTimerState("running");
    setStartTime(Date.now());
  };

  const handleStartLongBreak = () => {
    const prefs = getPreferenceDurations();
    setTimerMode("longBreak");
    setTimeLeft(prefs.longBreak);
    setTimerState("running");
    setStartTime(Date.now());
  };

  // Background helpers
  const sendRunningToBackground = async () => {
    await showHUD("🛰 Timer running in background");
    // Raycast will close if user leaves this command; state persists via timestamps.
  };

  const startPomodoroInBackground = async () => {
    const prefs = getPreferenceDurations();
    setTimerMode("pomodoro");
    const duration = customTimerDuration !== prefs.pomodoro ? customTimerDuration : prefs.pomodoro;
    setTimeLeft(duration);
    setTimerState("running");
    setStartTime(Date.now());
    await showHUD("🚀 Pomodoro started in background");
  };

  // Test sound action removed (no sound notifications)

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatTotalTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  const getProgressBar = (seconds: number): string => {
    const prefs = getPreferenceDurations();
    const duration =
      timerMode === "pomodoro" && customTimerDuration !== prefs.pomodoro ? customTimerDuration : getDuration(timerMode);
    // Clamp seconds so progress never exceeds full length
    const safeSeconds = Math.min(Math.max(seconds, 0), duration);
    const ratio = safeSeconds / duration;
    const segments = 20;
    const filled = Math.min(segments, Math.max(0, Math.round(ratio * segments)));
    const empty = Math.max(0, segments - filled);
    return "█".repeat(filled) + "░".repeat(empty);
  };

  const getModeEmoji = (): string => {
    switch (timerMode) {
      case "pomodoro":
        return "🍅";
      case "shortBreak":
        return "☕";
      case "longBreak":
        return "🌴";
    }
  };

  const getModeTitle = (): string => {
    switch (timerMode) {
      case "pomodoro":
        return "POMODORO TIMER";
      case "shortBreak":
        return "SHORT BREAK";
      case "longBreak":
        return "LONG BREAK";
    }
  };

  const getStateLabel = (): string => {
    switch (timerState) {
      case "idle":
        return "READY";
      case "running":
        return "ACTIVE";
      case "paused":
        return "PAUSED";
      case "complete":
        return "COMPLETE";
    }
  };

  const prefsForView = getPreferenceDurations();
  const activeDuration = timerMode === "pomodoro" ? customTimerDuration : getDuration(timerMode);
  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
  const progressPercent = clamp(Math.floor(((activeDuration - timeLeft) / activeDuration) * 100), 0, 100);
  const sessionsUntilLong =
    prefsForView.longBreakInterval -
    (stats.completedPomodoros % prefsForView.longBreakInterval || prefsForView.longBreakInterval);
  const nextLongBreakInfo =
    timerMode === "pomodoro"
      ? `Long break in ${sessionsUntilLong === 0 ? prefsForView.longBreakInterval : sessionsUntilLong} pomodoro${sessionsUntilLong === 1 ? "" : "s"}`
      : "";
  const durationLabel =
    timerMode === "pomodoro" && customTimerDuration !== prefsForView.pomodoro
      ? `Custom Duration: ${formatTime(customTimerDuration)}`
      : `Duration: ${formatTime(activeDuration)}`;

  const markdown =
    timerState === "complete"
      ? `# 🎉 Mission Complete!

## ${timerMode === "pomodoro" ? "🏆 Session Finished!" : "✅ Break Over!"}

---
### 📊 Your Stats
- Today: ${stats.todayPomodoros}
- Total: ${stats.completedPomodoros}
- Streak: ${stats.currentStreak} ${stats.currentStreak === 1 ? "day" : "days"}
- Focus: ${formatTotalTime(stats.totalFocusTime)}
- XP: ${stats.completedPomodoros * 100}

---
${timerMode === "pomodoro" ? "☕ Take a short break or start another." : "💪 Ready for more focus!"}
${nextLongBreakInfo ? `\n\n🔄 ${nextLongBreakInfo}` : ""}
`
      : `# ${getModeEmoji()} ${getModeTitle()}

## ⏰ ${formatTime(timeLeft)}
${durationLabel}

### Status: ${getStateLabel()} (${progressPercent}%)

${getProgressBar(timeLeft)}

### Progress Today
- Sessions: ${stats.todayPomodoros}
- Streak: ${stats.currentStreak} ${stats.currentStreak === 1 ? "day" : "days"}
- XP: ${stats.completedPomodoros * 100}
${nextLongBreakInfo ? `- ${nextLongBreakInfo}` : ""}

### Preferences
- Work: ${formatTime(prefsForView.pomodoro)}
- Short Break: ${formatTime(prefsForView.shortBreak)}
- Long Break: ${formatTime(prefsForView.longBreak)}
- Interval: every ${prefsForView.longBreakInterval} pomodoros
${prefsForView.autoStartBreaks ? "- Auto-start Breaks: ON" : "- Auto-start Breaks: OFF"}

*Stay focused. One block at a time.*`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          {timerState === "complete" && (
            <>
              <Action title="🍅 Start Pomodoro" onAction={handleStartPomodoro} />
              <Action title="☕ Short Break (5 Min)" onAction={handleStartShortBreak} />
              <Action title="🌴 Long Break (15 Min)" onAction={handleStartLongBreak} />
            </>
          )}
          {timerState === "idle" && (
            <>
              <Action title="▶️ Start Timer" onAction={handleResume} />
              <Action title="🍅 Pomodoro" onAction={handleStartPomodoro} />
              <Action title="☕ Short Break" onAction={handleStartShortBreak} />
              <Action title="🌴 Long Break" onAction={handleStartLongBreak} />
              {getPreferenceDurations().enableBackgroundMode && (
                <Action title="🚀 Start in Background" onAction={startPomodoroInBackground} />
              )}
            </>
          )}
          {timerState === "running" && (
            <>
              <Action title="⏸️ Pause Timer" onAction={handlePause} />
              <Action title="🔄 Reset Timer" onAction={handleReset} />
              {getPreferenceDurations().enableBackgroundMode && (
                <Action title="🛰 Send to Background" onAction={sendRunningToBackground} />
              )}
            </>
          )}
          {timerState === "paused" && (
            <>
              <Action title="▶️ Resume Timer" onAction={handleResume} />
              <Action title="🔄 Reset Timer" onAction={handleReset} />
              <Action title="🍅 New Pomodoro" onAction={handleStartPomodoro} />
              {getPreferenceDurations().enableBackgroundMode && (
                <Action title="🛰 Resume in Background" onAction={sendRunningToBackground} />
              )}
            </>
          )}
        </ActionPanel>
      }
    />
  );
}
