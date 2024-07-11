import { Grid } from "@raycast/api";
import React, { useState, useEffect } from "react";
import { getStoredTimers, storeTimers } from "../utils/storage";
import type { Timer } from "../utils/timerUtils";
import { TimerTile } from "./TimerTile";

export function TimerOverview() {
  const [timers, setTimers] = useState<Timer[]>([]);

  useEffect(() => {
    const loadTimers = async () => {
      const storedTimers = await getStoredTimers();
      setTimers(storedTimers);
    };
    loadTimers();
  }, []);

  const updateTimer = (updatedTimer: Timer) => {
    const newTimers = timers.map((timer) => (timer.id === updatedTimer.id ? updatedTimer : timer));
    setTimers(newTimers);
    storeTimers(newTimers);
  };

  const deleteTimer = (id: string) => {
    const newTimers = timers.filter((timer) => timer.id !== id);
    setTimers(newTimers);
    storeTimers(newTimers);
  };

  return (
    <Grid columns={3}>
      {timers.map((timer) => (
        <TimerTile key={timer.id} timer={timer} onUpdate={updateTimer} onDelete={deleteTimer} />
      ))}
      {/* Add a tile for creating a new timer */}
      <Grid.Item
        content={{
          value: { source: "system", tintColor: "blue" },
          tooltip: "Add New Timer",
        }}
        title="Add New Timer"
      />
    </Grid>
  );
}
