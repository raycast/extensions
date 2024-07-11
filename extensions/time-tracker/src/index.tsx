import { Action, ActionPanel, Color, Grid, Icon, Toast, showToast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { AddNewTimerForm } from "./components/AddNewTimerForm";
import { TimerChart } from "./components/TimerChart";
import { TimerTile } from "./components/TimerTile";
import { getStoredTimers, storeTimers } from "./utils/storage";
import type { Timer } from "./utils/timerUtils";

export default function Command() {
  const [timers, setTimers] = useState<Timer[]>([]);

  const updateRunningTimers = useCallback((storedTimers: Timer[]) => {
    const currentTime = Date.now();
    return storedTimers.map((timer) => {
      if (timer.isRunning && timer.startTime) {
        const elapsedSeconds = Math.floor((currentTime - timer.startTime) / 1000);
        return {
          ...timer,
          totalSeconds: timer.totalSeconds + elapsedSeconds,
          startTime: currentTime,
        };
      }
      return timer;
    });
  }, []);

  useEffect(() => {
    const loadTimers = async () => {
      const storedTimers = await getStoredTimers();
      const updatedTimers = updateRunningTimers(storedTimers);
      setTimers(updatedTimers);
      await storeTimers(updatedTimers);
    };
    loadTimers();
  }, [updateRunningTimers]);

  const updateTimer = async (updatedTimer: Timer) => {
    const currentTime = Date.now();

    const newTimers = timers.map((timer) => {
      if (timer.id === updatedTimer.id) {
        // If this is the timer being updated
        if (timer.isRunning && !updatedTimer.isRunning) {
          // Timer is being stopped
          const elapsedSeconds = timer.startTime ? Math.floor((currentTime - timer.startTime) / 1000) : 0;
          return {
            ...updatedTimer,
            totalSeconds: timer.totalSeconds + elapsedSeconds,
            logs: [
              ...timer.logs,
              {
                id: uuidv4(),
                startTime: timer.startTime
                  ? new Date(timer.startTime).toISOString()
                  : new Date(currentTime).toISOString(),
                endTime: new Date(currentTime).toISOString(),
                duration: elapsedSeconds,
              },
            ],
            startTime: undefined,
          };
        }
        if (!timer.isRunning && updatedTimer.isRunning) {
          // Timer is being started
          return {
            ...updatedTimer,
            startTime: currentTime,
          };
        }
        return updatedTimer;
      }
      if (updatedTimer.isRunning && timer.isRunning) {
        // If we're starting a new timer and this one was running
        const elapsedSeconds = timer.startTime ? Math.floor((currentTime - timer.startTime) / 1000) : 0;
        return {
          ...timer,
          isRunning: false,
          totalSeconds: timer.totalSeconds + elapsedSeconds,
          logs: [
            ...timer.logs,
            {
              id: uuidv4(),
              startTime: timer.startTime
                ? new Date(timer.startTime).toISOString()
                : new Date(currentTime).toISOString(),
              endTime: new Date(currentTime).toISOString(),
              duration: elapsedSeconds,
            },
          ],
          startTime: undefined,
        };
      }
      return timer;
    });

    setTimers(newTimers);
    await storeTimers(newTimers);
  };

  const deleteTimer = async (id: string) => {
    const newTimers = timers.filter((timer) => timer.id !== id);
    setTimers(newTimers);
    await storeTimers(newTimers);
  };

  const addNewTimer = async (newTimer: Timer) => {
    const updatedTimers = [...timers, newTimer];
    setTimers(updatedTimers);
    await storeTimers(updatedTimers);
    await showToast({
      style: Toast.Style.Success,
      title: "Timer Added",
      message: `${newTimer.name} has been added to your timers.`,
    });
  };

  return (
    <Grid columns={6}>
      <Grid.Section title="Timers">
        {timers.map((timer) => (
          <TimerTile key={timer.id} timer={timer} onUpdate={updateTimer} onDelete={deleteTimer} />
        ))}
      </Grid.Section>
      <Grid.Section title="Options">
        <Grid.Item
          content={{
            source: Icon.Plus,
            tintColor: Color.Blue,
          }}
          title="Add New Timer"
          actions={
            <ActionPanel>
              <Action.Push title="Add New Timer" target={<AddNewTimerForm onAdd={addNewTimer} />} />
            </ActionPanel>
          }
        />
        <Grid.Item
          content={{
            source: Icon.PieChart,
            tintColor: Color.Green,
          }}
          title="View Time Distribution"
          actions={
            <ActionPanel>
              <Action.Push title="View Time Distribution" target={<TimerChart timers={timers} />} />
            </ActionPanel>
          }
        />
      </Grid.Section>
    </Grid>
  );
}
