import { environment, popToRoot, showHUD } from "@raycast/api";
import { exec, execSync } from "child_process";
import { randomUUID } from "crypto";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { CustomTimer, Timer } from "./types";
import { formatTime } from "./formatUtils";

const DATAPATH = environment.supportPath + "/customTimers.json";

const SLEEP_TIMER_FILE = environment.supportPath + "/" + "sleep.timer";

async function startTimer(timeInSeconds: number, timerName = "Untitled") {
  const fileContent = `${timerName};${new Date().toISOString()};${timeInSeconds}`;
  writeFileSync(SLEEP_TIMER_FILE, fileContent);

  let command = `sleep ${timeInSeconds} && if [ -f "${SLEEP_TIMER_FILE}" ]; then `;
  command += ` rm "${SLEEP_TIMER_FILE}" && pmset sleepnow; else echo "Timer deleted"; fi`;
  exec(command, (error, stderr) => {
    if (error) {
      console.log(`error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.log(`stderr: ${stderr}`);
      return;
    }
  });
  popToRoot();
  await showHUD(`Timer "${timerName}" started for ${formatTime(timeInSeconds)}! 🎉`);
}

function stopTimer() {
  const deleteTimerCmd = `if [ -f "${SLEEP_TIMER_FILE}" ]; then rm "${SLEEP_TIMER_FILE}"; else echo "Timer deleted"; fi`;
  execSync(deleteTimerCmd);
}

function getTimer() {
  let timer: Timer | undefined = undefined;

  if (existsSync(SLEEP_TIMER_FILE)) {
    const file = readFileSync(SLEEP_TIMER_FILE);
    const [name, timeStarted, timeLeft] = file.toString().split(";");
    timer = {
      name,
      secondsSet: -99,
      timeLeft: -99,
      originalFile: SLEEP_TIMER_FILE,
    };

    timer.secondsSet = parseInt(timeLeft);
    timer.timeLeft = Math.max(
      0,
      Math.round(timer.secondsSet - (new Date().getTime() - new Date(timeStarted).getTime()) / 1000),
    );
  }

  return timer;
}

function renameTimer(timerFile: string, newName: string) {
  const dataPath = environment.supportPath + "/" + timerFile;
  writeFileSync(dataPath, newName);
}

function ensureCTFileExists() {
  if (!existsSync(DATAPATH)) {
    writeFileSync(DATAPATH, JSON.stringify({}));
  }
}

function createCustomTimer(newTimer: CustomTimer) {
  ensureCTFileExists();
  const customTimers = JSON.parse(readFileSync(DATAPATH, "utf8"));
  customTimers[randomUUID()] = newTimer;
  writeFileSync(DATAPATH, JSON.stringify(customTimers));
}

function readCustomTimers() {
  ensureCTFileExists();
  const customTimers = JSON.parse(readFileSync(DATAPATH, "utf8"));
  return customTimers;
}

function renameCustomTimer(ctID: string, newName: string) {
  ensureCTFileExists();
  const customTimers = JSON.parse(readFileSync(DATAPATH, "utf8"));
  customTimers[ctID].name = newName;
  writeFileSync(DATAPATH, JSON.stringify(customTimers));
}

function deleteCustomTimer(ctID: string) {
  ensureCTFileExists();
  const customTimers = JSON.parse(readFileSync(DATAPATH, "utf8"));
  delete customTimers[ctID];
  writeFileSync(DATAPATH, JSON.stringify(customTimers));
}

export {
  createCustomTimer,
  deleteCustomTimer,
  ensureCTFileExists,
  getTimer,
  readCustomTimers,
  renameTimer,
  renameCustomTimer,
  startTimer,
  stopTimer,
};
