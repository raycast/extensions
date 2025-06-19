import { ActionPanel, Action, Icon, List, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { getState, setState, ChronometerState, Lap } from "./state";

// Debounce function for number parameters
function debounceNumber(func: (value: number) => void, wait: number): (value: number) => void {
  let timeout: NodeJS.Timeout;
  return (value: number) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(value), wait);
  };
}

// Debounce function for general use
function debounce<T extends (...args: unknown[]) => unknown>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export default function Command() {
  const [state, setLocalState] = useState<ChronometerState>({
    isRunning: false,
    startTime: null,
    currentTime: 0,
    laps: [],
    lastLapTime: 0,
  });

  // Load initial state
  useEffect(() => {
    loadState();
  }, []);

  // Refresh state periodically with debounce
  useEffect(() => {
    const debouncedLoadState = debounce(loadState, 100);
    const interval = setInterval(debouncedLoadState, 100);
    return () => clearInterval(interval);
  }, []);

  // Update timer with debounced state updates
  useEffect(() => {
    let interval: NodeJS.Timeout;
    const debouncedSetState = debounceNumber((newTime: number) => {
      setLocalState((prev) => ({
        ...prev,
        currentTime: newTime,
      }));
    }, 100);

    if (state.isRunning) {
      interval = setInterval(() => {
        const currentTime = Date.now() - (state.startTime || Date.now());
        debouncedSetState(currentTime);
      }, 10);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [state.isRunning, state.startTime]);

  const loadState = async () => {
    const savedState = await getState();
    setLocalState((prev) => ({
      ...prev,
      ...savedState,
      // Keep the current time calculation if running
      currentTime: savedState.isRunning ? Date.now() - (savedState.startTime || Date.now()) : savedState.currentTime,
    }));
  };

  const updateState = async (newState: Partial<ChronometerState>) => {
    const updatedState = { ...state, ...newState };
    setLocalState(updatedState);
    await setState(updatedState);
  };

  const formatTime = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = Math.floor((ms % 1000) / 100);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${milliseconds}`;
  };

  const formatHumanReadableTime = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = Math.floor((ms % 1000) / 100);

    if (minutes > 0) {
      return `${minutes}m ${seconds}s ${milliseconds}ms`;
    } else if (seconds > 0) {
      return `${seconds}s ${milliseconds}ms`;
    } else {
      return `${milliseconds}ms`;
    }
  };

  const handleStart = async () => {
    if (!state.isRunning) {
      const startTime = Date.now() - state.currentTime;
      await updateState({
        startTime,
        isRunning: true,
      });
    }
  };

  const handleStop = async () => {
    if (state.isRunning) {
      await updateState({
        isRunning: false,
        currentTime: Date.now() - (state.startTime || Date.now()),
      });
    }
  };

  const handleLap = async () => {
    if (state.isRunning) {
      const currentTime = Date.now() - (state.startTime || Date.now());
      const lapTime = currentTime - state.lastLapTime;
      const newLap: Lap = {
        number: state.laps.length + 1,
        time: formatTime(lapTime),
        totalTime: formatTime(currentTime),
      };
      await updateState({
        lastLapTime: currentTime,
        laps: [newLap, ...state.laps],
      });
    }
  };

  const handleReset = async () => {
    await updateState({
      isRunning: false,
      currentTime: 0,
      laps: [],
      lastLapTime: 0,
      startTime: null,
    });
  };

  const handleCopyTime = async () => {
    await showToast({
      style: Toast.Style.Success,
      title: "Copied to clipboard",
      message: formatHumanReadableTime(state.currentTime),
    });
  };

  return (
    <List>
      <List.Item
        title={formatTime(state.currentTime)}
        subtitle={state.isRunning ? "Running" : "Stopped"}
        icon={state.isRunning ? Icon.Clock : Icon.Stop}
        accessories={[
          {
            text: formatHumanReadableTime(state.currentTime),
            tooltip: "Human readable time",
          },
        ]}
        actions={
          <ActionPanel>
            {!state.isRunning ? (
              <Action title="Start" icon={Icon.Play} onAction={handleStart} />
            ) : (
              <>
                <Action title="Stop" icon={Icon.Stop} onAction={handleStop} />
                <Action title="Lap" icon={Icon.Clock} onAction={handleLap} />
              </>
            )}
            <Action title="Reset" icon={Icon.ArrowCounterClockwise} onAction={handleReset} />
            <Action
              title="Copy Elapsed Time"
              icon={Icon.Clipboard}
              onAction={handleCopyTime}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          </ActionPanel>
        }
      />
      {state.laps.map((lap) => (
        <List.Item
          key={lap.number}
          title={`Lap ${lap.number}`}
          subtitle={`Lap Time: ${lap.time} | Total: ${lap.totalTime}`}
          icon={Icon.Stopwatch}
          actions={
            <ActionPanel>
              <Action title="Copy Lap Time" icon={Icon.Clipboard} onAction={() => handleCopyTime()} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
