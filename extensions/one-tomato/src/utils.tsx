import { getSession, getSessionRemainingTime } from "./controller";

export function millisecondsToMinutesAndSeconds(milliseconds: number) {
  const minutes = Math.floor(milliseconds / 60000);
  const seconds = ((milliseconds % 60000) / 1000).toFixed(0);
  return `${minutes}:${parseInt(seconds) < 10 ? "0" : ""}${seconds}`;
}

export function millisecondsToMinutes(milliseconds: number) {
  // Add 1 to the minutes to account for the fact that the timer ends at 0 minutes
  const minutes = Math.floor(milliseconds / 60000) + 1;
  return `${minutes}`;
}

export function progressPercentage() {
  const session = getSession();
  if (session) {
    // set the total according to the session duration
    let total = 0;
    if (session.type === "focus") {
      total = 25 * 60 * 1000;
    } else if (session.type === "shortBreak") {
      total = 5 * 60 * 1000;
    } else if (session.type === "longBreak") {
      total = 15 * 60 * 1000;
    } else {
      throw new Error("Invalid session type");
    }
    const remaining = getSessionRemainingTime();
    const progress = ((total - remaining) / total) * 100;
    //make sure the progress is not greater than 100
    if (progress > 100) {
      return 100;
    }
    return progress;
  }
  return 0;
}
