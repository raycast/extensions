import { LaunchProps } from "@raycast/api";
import { showHUD } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { exec } from "child_process";
import { runner } from "./timer";
import Paths from "./Paths";
import * as fs from "node:fs";

export default async function main(props: LaunchProps<{ arguments: Arguments.AddReminder }>) {
  try {
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

  try {
    fs.writeFileSync(reminder.timerFile, JSON.stringify(reminder, null, 2), "utf8");
  } catch (error) {
    showFailureToast(error, { title: "Failed to save reminder" });
    return;
  }
  exec(runner(reminder), (error, stdout, stderr) => {
    if (error) {
      showFailureToast(error, { title: "Failed to execute reminder script" });
      return;
    }

    if (stderr) {
      showFailureToast(new Error(stderr), { title: "Reminder script error" });
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
