import fs from "node:fs";
import Paths from "../Paths";
import Reminder from "../Reminder";
import { promises as fsPromises } from "fs";

export function runner(props: {
  timerFile: string;
  targetTimestamp: number;
  message: string;
  messageScriptFile: string;
}) {
  return `
    timerFile="${props.timerFile}"
    targetTimestamp="${props.targetTimestamp}"
    message="${props.message}"
    messageScriptFile="${props.messageScriptFile}"
    
    while true; do
    #    status=$(cat "$timerFile")
    #    exit if timer not exists
        if [ ! -f "$timerFile" ]; then
          exit 1
        fi
    
        currentTimestamp=$(python3 -c "import time; print(int(time.time() * 1000))")
        if [ "$currentTimestamp" -ge "$targetTimestamp" ]; then
            python3 "$messageScriptFile" "$message"
            rm "$timerFile"
            exit 1
        fi
    
        sleep 0.1
    done
  `;
}

export async function load(): Promise<Reminder[]> {
  const fileNames = await fsPromises.readdir(Paths.TIMER_PATH);

  const files = await Promise.all(
    fileNames.map(
      (id) =>
        new Promise<string>((resolve, reject) =>
          fs.readFile(`${Paths.TIMER_PATH}/${id}`, "utf-8", (err, data) => {
            if (err) reject(err);
            else resolve(data);
          }),
        ),
    ),
  );

  return files.map((file) => JSON.parse(file));
}

export function formatRemainingTime(targetTimestamp: number): string {
  const remainingSeconds = (targetTimestamp - Date.now()) / 1000;
  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = Math.floor((remainingSeconds % 3600) % 60);

  if (remainingSeconds > 3600) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (remainingSeconds > 60) {
    return `${minutes}m ${seconds}s`;
  } else {
    if (seconds < 0) {
      return "0s";
    } else {
      return `${seconds}s`;
    }
  }
}
