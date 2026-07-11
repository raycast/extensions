import { execSync } from "child_process";

export type ScreenTimeState = {
  time: number;
  lastWake: number;
  duration: string;
};

export const getScreenState = (): ScreenTimeState => {
  try {
    const stdout = execSync("pmset -g log | grep -e 'Wake.*due to' | tail -n 1").toString();
    const timestamp = stdout.match(/\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}/)?.[0];

    if (!timestamp) {
      throw new Error("Could not parse wake time");
    }

    const lastWake = new Date(timestamp).getTime();
    const now = Date.now();
    const diffMs = now - lastWake;

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return {
      time: now,
      lastWake,
      duration: `${hours}:${String(minutes).padStart(2, "0")}`,
    };
  } catch (error) {
    console.error("Screen time detection error:", error);
    return {
      time: Date.now(),
      lastWake: 0,
      duration: "--:--",
    };
  }
};
