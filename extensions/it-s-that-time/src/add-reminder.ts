import { LaunchProps } from "@raycast/api";
import { showHUD } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { exec } from "child_process";
import { runner } from "./timer";
import Paths from "./Paths";
import * as fs from "node:fs";

export default function main(props: LaunchProps<{ arguments: Arguments.AddReminder }>) {
  if (!fs.existsSync(Paths.TIMER_PATH)) {
    fs.mkdirSync(Paths.TIMER_PATH, { recursive: true });
  }

  const seconds = argumentsToSeconds(props.arguments);
  const targetTimestamp = Date.now() + seconds * 1000;
  const id = randomUUID();
  const reminder = {
    id: id,
    timerFile: `${Paths.TIMER_PATH}/${id}`,
    targetTimestamp: targetTimestamp,
    message: props.arguments.message,
    messageScriptFile: Paths.MESSAGE_SCRIPT_FILE,
  };

  fs.writeFileSync(reminder.timerFile, JSON.stringify(reminder, null, 2), "utf8");
  exec(runner(reminder), (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing script: ${error.message}`);
      return;
    }

    if (stderr) {
      console.error(`Script error output: ${stderr}`);
      return;
    }
    console.log(`Script output: ${stdout}`);
  });

  showHUD(`New Reminder Added`);
}

function argumentsToSeconds(args: Arguments.AddReminder) {
  const h = parseIntOrZero(args.hours);
  const m = parseIntOrZero(args.minutes);
  const s = parseIntOrZero(args.seconds);

  return h * 3600 + m * 60 + s;
}

function parseIntOrZero(value: string): number {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? 0 : parsed;
}
