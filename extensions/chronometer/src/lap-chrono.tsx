import { showToast, Toast, updateCommandMetadata } from "@raycast/api";
import { getState, setState, Lap } from "./state";

function formatTime(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = Math.floor((ms % 1000) / 100);
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${milliseconds}`;
}

export default async function main() {
  const state = await getState();

  if (!state.isRunning) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Chronometer is not running",
    });
    return;
  }

  const currentTime = Date.now() - (state.startTime || Date.now());
  const lapTime = currentTime - state.lastLapTime;

  await updateCommandMetadata({ subtitle: `Elapsed: ${formatTime(currentTime)}` });

  const newLap: Lap = {
    number: state.laps.length + 1,
    time: formatTime(lapTime),
    totalTime: formatTime(currentTime),
  };

  await setState({
    ...state,
    lastLapTime: currentTime,
    laps: [newLap, ...state.laps],
  });

  await showToast({
    style: Toast.Style.Success,
    title: `Lap ${newLap.number} recorded`,
    message: `Time: ${newLap.time}`,
  });
}
