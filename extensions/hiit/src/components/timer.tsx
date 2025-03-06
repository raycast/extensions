import { useEffect, useRef, useState } from "react";
import { Item, Preferences } from "../types";
import { Action, ActionPanel, List, environment, getPreferenceValues, open } from "@raycast/api";
import { exec } from "child_process";
import { secondsToTime } from "../utils";
import { nanoid } from "nanoid";
import { addItem } from "../storage";
import { HISTORY_KEY } from "../constants";

export function Timer(props: { item: Item }) {
  const { item } = props;
  const preferences = getPreferenceValues<Preferences>();
  const intervalTimerRef = useRef<NodeJS.Timeout>();
  const [paused, setPaused] = useState<boolean>(false);
  const pausedRef = useRef<boolean>(false);
  const secondsRef = useRef<number>(item.interval.warmup > 0 ? item.interval.warmup : item.interval.high);
  const [seconds, setSeconds] = useState<number>(item.interval.warmup > 0 ? item.interval.warmup : item.interval.high);
  const periodsRef = useRef<string>(item.interval.warmup > 0 ? "WARMUP" : "HIGH");
  const [period, setPeriod] = useState<string>(item.interval.warmup > 0 ? "WARMUP" : "HIGH");
  const intervalsRef = useRef<number>(item.interval.intervals);
  const [intervals, setintervals] = useState<number>(intervalsRef.current);
  const [totalTime, setTotalTime] = useState<number>(0);
  const totalTimeRef = useRef<number>(0);
  const [currentHistoryId, setCurrentHistoryId] = useState<string>(nanoid());

  // region Cleanup after component unmounts
  useEffect(() => {
    return function cleanup() {
      if (intervalTimerRef.current) {
        clearInterval(intervalTimerRef.current);

        if (totalTimeRef.current !== 0 && item.interval.totalTime === totalTimeRef.current) {
          const newItem = { ...item, id: currentHistoryId, finished: true, date: new Date().getTime() };
          addItem(newItem, HISTORY_KEY);
        }
      }
    };
  }, []);
  // endregion

  function togglePause() {
    setPaused(!pausedRef.current);
    pausedRef.current = !pausedRef.current;
  }

  function StartSession() {
    clearInterval(intervalTimerRef.current);
    intervalTimerRef.current = setInterval(() => {
      // Check if paused
      if (pausedRef.current) return;

      // Count down current period
      countdown(false);

      if (intervalsRef.current === item.interval.intervals) {
        if (!["WARMUP", "COOLDOWN"].includes(periodsRef.current)) {
          intervalsRef.current -= 1;
          setintervals(intervalsRef.current);
        }
      }

      if (secondsRef.current === 0) {
        // If current period is done
        if (intervalsRef.current === 1 && item.interval.cooldown > 0) {
          periodsRef.current = "COOLDOWN";
          setPeriod(periodsRef.current);

          secondsRef.current = item.interval.cooldown;
          setSeconds(secondsRef.current);
        } else {
          // If there is no more intervals
          if (intervalsRef.current === 0) {
            clearInterval(intervalTimerRef.current);
            return;
          }
        }

        if (periodsRef.current === "HIGH") {
          periodsRef.current = "LOW";
          setPeriod(periodsRef.current);

          secondsRef.current = item.interval.low;
          setSeconds(secondsRef.current);
        } else if (["LOW", "WARMUP"].includes(periodsRef.current)) {
          periodsRef.current = "HIGH";
          setPeriod(periodsRef.current);

          secondsRef.current = item.interval.high;
          setSeconds(secondsRef.current);
        }

        intervalsRef.current -= 1;
        setintervals(intervalsRef.current);
      }
    }, 1000);

    intervalsRef.current -= 1;
    setintervals(intervalsRef.current);
    countdown(true);

    const newItem = { ...item, id: currentHistoryId, finished: false, date: new Date().getTime() };
    addItem(newItem, HISTORY_KEY);
  }

  function getNextStage() {
    if (periodsRef.current === "HIGH") {
      if (intervalsRef.current === 1 && item.interval.cooldown > 0) {
        return "Cooldown";
      }

      return "Low";
    } else if (["LOW", "WARMUP"].includes(periodsRef.current)) {
      return "High";
    } else if (periodsRef.current === "COOLDOWN") {
      return "Done";
    }
  }

  function countdown(playSound: boolean) {
    setTotalTime((previous) => previous + 1);
    totalTimeRef.current += 1;

    setSeconds((previous) => previous - 1);
    secondsRef.current -= 1;

    if (preferences.beep) {
      if (secondsRef.current > 0 && secondsRef.current < 4 && preferences.beep) {
        exec(`afplay ${environment.assetsPath}/beep01.mp3 && $$`);
      }
    }

    if (playSound && preferences.intervalbeep !== "none") {
      if (preferences.intervalbeep === "pronounce") {
        exec(`say Warmup`);
      } else {
        exec(`afplay ${environment.assetsPath}/beep.mp3 && $$`);
      }
    }

    if (secondsRef.current === 0 && preferences.intervalbeep !== "none") {
      if (preferences.intervalbeep === "pronounce") {
        exec(`say ${getNextStage()}`);
      } else {
        exec(`afplay ${environment.assetsPath}/beep.mp3 && $$`);
      }
    }
  }

  let title = `${secondsToTime(seconds)}`;
  if (totalTime === 0) {
    title = "Ready";
  } else if (pausedRef.current) {
    title = "Paused";
  } else if (item.interval.totalTime === totalTime) {
    open("raycast://confetti");
    title = "Done";
  }

  const description =
    totalTime > 0
      ? [
          `ELAPSED: ${secondsToTime(totalTime)}`,
          `INTERVAL: ${(intervals - item.interval.intervals) * -1} / ${item.interval.intervals}`,
          `REMAINING: ${secondsToTime(item.interval.totalTime - totalTime)}`,
        ]
      : ["PRESS ENTER TO START"];

  return (
    <List
      navigationTitle={`${item.title}: ${item.interval.high} / ${item.interval.low} @ ${secondsToTime(
        item.interval.totalTime
      )}`}
    >
      <List.EmptyView
        icon={`${period}.png`}
        title={title}
        description={description.join("     ")}
        actions={
          <ActionPanel>
            {totalTime === 0 && <Action title="Start" onAction={StartSession} />}
            {pausedRef.current && <Action title="Start" onAction={togglePause} />}
            {!pausedRef.current && totalTime > 0 && item.interval.totalTime - totalTime > 0 && (
              <Action title="Pause" onAction={togglePause} />
            )}
          </ActionPanel>
        }
      />
    </List>
  );
}
