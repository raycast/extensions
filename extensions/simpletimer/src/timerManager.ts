import { environment, showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import { readFileSync, writeFileSync, unlinkSync, readdirSync, existsSync } from "fs";
import { extname } from "path";

interface RawTimer {
  name: string;
  pid?: number;
  createdAt: string;
  totalSeconds: number;
}

export interface ListedTimer {
  fileName: string;
  name: string;
  pid?: number;
  createdAt: Date;
  totalSeconds: number;
  timeLeft: number;
}

const TIMERS_DIR = environment.supportPath;

export async function startTimer(timeInSeconds: number, timerName: string): Promise<void> {
  if (timeInSeconds <= 0) {
    await showToast(Toast.Style.Failure, "Invalid time", "time must be > 0");
    return;
  }

  const nowISO = new Date().toISOString().replace(/:/g, "__");
  const fileName = `${nowISO}---${timeInSeconds}.timer`;
  const filePath = `${TIMERS_DIR}/${fileName}`;

  const cmd = timerScript(filePath, timerName, timeInSeconds);
  const child = exec(cmd, (error, stderr) => {
    if (error) {
      console.error("exec error:", error.message);
    }
    if (stderr) {
      console.error("stderr:", stderr);
    }
  });

  const rawTimer: RawTimer = {
    name: timerName || "Untitled",
    pid: child.pid,
    createdAt: new Date().toISOString(),
    totalSeconds: timeInSeconds,
  };

  writeFileSync(filePath, JSON.stringify(rawTimer));

  await showToast(Toast.Style.Success, `Started timer: "${timerName}"`);
}

function timerScript(filePath: string, timerName: string, timeInSeconds: number): string {
  const sanitizedFilePath = filePath;
  const nameForScript = timerName.replace(/"/g, '\\"');
  const cmd = [
    `sleep ${timeInSeconds}`,
    `if [ -f "${sanitizedFilePath}" ]; then`,
    `  osascript -e 'display notification "Timer \\"${nameForScript}\\" completed"'`,
    `  afplay /System/Library/Sounds/Funk.aiff`,
    `  rm "${sanitizedFilePath}"`,
    `fi`,
  ].join("\n");
  return cmd;
}

export async function stopTimer(partialName: string): Promise<void> {
  const files = readdirSync(TIMERS_DIR).filter((f) => f.endsWith(".timer"));
  const matched = files.find((f) => f.includes(partialName));
  if (!matched) {
    await showToast(Toast.Style.Failure, "No timer found");
    return;
  }
  const filePath = `${TIMERS_DIR}/${matched}`;
  try {
    unlinkSync(filePath);
    await showToast(Toast.Style.Success, `Stopped timer: ${matched}`);
  } catch (error) {
    console.error(error);
    await showToast(Toast.Style.Failure, "Failed to stop timer");
  }
}

export function listTimers(): ListedTimer[] {
  if (!existsSync(TIMERS_DIR)) {
    return [];
  }

  const files = readdirSync(TIMERS_DIR);
  const timers: ListedTimer[] = [];

  for (const file of files) {
    if (extname(file) === ".timer") {
      const filePath = `${TIMERS_DIR}/${file}`;
      try {
        const rawJSON = readFileSync(filePath, "utf-8");
        const rawTimer: RawTimer = JSON.parse(rawJSON);

        const listed: ListedTimer = {
          fileName: file,
          name: rawTimer.name,
          pid: rawTimer.pid,
          totalSeconds: rawTimer.totalSeconds,
          createdAt: new Date(rawTimer.createdAt),
          timeLeft: calcTimeLeft(file),
        };
        timers.push(listed);
      } catch (err) {
        console.error("Error reading .timer file:", file, err);
      }
    }
  }

  return timers.sort((a, b) => a.timeLeft - b.timeLeft);
}

function calcTimeLeft(fileName: string): number {
  const [startStr, secondsPart] = fileName.split("---");
  if (!secondsPart) return 0;

  const secondsFromFileName = parseInt(secondsPart.replace(".timer", ""), 10);
  const startISO = startStr.replace(/__/g, ":");
  const startDate = new Date(startISO);
  const now = new Date();

  const elapsed = (now.getTime() - startDate.getTime()) / 1000;
  const left = secondsFromFileName - elapsed;
  return left > 0 ? Math.round(left) : 0;
}
