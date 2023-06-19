import { environment, getPreferenceValues, popToRoot, showHUD, showToast, Toast } from "@raycast/api";
import { exec, execSync } from "child_process";
import { randomUUID } from "crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { extname } from "path";
import { CustomTimer, Preferences, Timer } from "./types";
import { formatTime, secondsBetweenDates } from "./formatUtils";

const DATAPATH = environment.supportPath + "/customTimers.json";

const checkForOverlyLoudAlert = (launchedFromMenuBar = false) => {
  const prefs = getPreferenceValues<Preferences>();
  if (parseFloat(prefs.volumeSetting) > 5.0) {
    const errorMsg = "⚠️ Timer alert volume should not be louder than 5 (it can get quite loud!)";
    if (launchedFromMenuBar) {
      showHUD(errorMsg);
    } else {
      showToast({ style: Toast.Style.Failure, title: errorMsg });
    }
    return false;
  }
  return true;
};

async function startTimer(timeInSeconds: number, timerName = "Untitled", selectedSound = "default") {
  const fileName = environment.supportPath + "/" + new Date().toISOString() + "---" + timeInSeconds + ".timer";
  const masterName = fileName.replace(/:/g, "__");
  writeFileSync(masterName, timerName);

  const prefs = getPreferenceValues<Preferences>();
  const selectedSoundPath = `${
    environment.assetsPath + "/" + (selectedSound === "default" ? prefs.selectedSound : selectedSound)
  }`;
  const cmdParts = [`sleep ${timeInSeconds}`];
  cmdParts.push(
    `if [ -f "${masterName}" ]; then osascript -e 'display notification "Timer \\"${timerName}\\" complete" with title "Ding!"'`
  );
  const afplayString = `afplay "${selectedSoundPath}" --volume ${prefs.volumeSetting.replace(",", ".")}`;
  if (prefs.selectedSound === "speak_timer_name") {
    cmdParts.push(`say "${timerName}"`);
  } else {
    cmdParts.push(afplayString);
  }
  if (prefs.ringContinuously) {
    const dismissFile = `${masterName}`.replace(".timer", ".dismiss");
    writeFileSync(dismissFile, ".dismiss file for Timers");
    cmdParts.push(`while [ -f "${dismissFile}" ]; do ${afplayString}; done`);
  }
  cmdParts.push(`rm "${masterName}"; else echo "Timer deleted"; fi`);
  exec(cmdParts.join(" && "), (error, stderr) => {
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

function stopTimer(timerFile: string) {
  const deleteTimerCmd = `if [ -f "${timerFile}" ]; then rm "${timerFile}"; else echo "Timer deleted"; fi`;
  const dismissFile = timerFile.replace(".timer", ".dismiss");
  const deleteDismissCmd = `if [ -f "${dismissFile}" ]; then rm "${dismissFile}"; else echo "Timer deleted"; fi`;
  execSync(deleteTimerCmd);
  execSync(deleteDismissCmd);
}

function getTimers() {
  const setOfTimers: Timer[] = [];
  const files = readdirSync(environment.supportPath);
  files.forEach((timerFile: string) => {
    if (extname(timerFile) == ".timer") {
      const timer: Timer = {
        name: "",
        secondsSet: -99,
        timeLeft: -99,
        originalFile: timerFile,
        timeEnds: new Date(),
      };
      timer.name = readFileSync(environment.supportPath + "/" + timerFile).toString();
      const timerFileParts = timerFile.split("---");
      timer.secondsSet = Number(timerFileParts[1].split(".")[0]);
      const timeStarted = timerFileParts[0].replace(/__/g, ":");
      timer.timeLeft = Math.max(0, Math.round(timer.secondsSet - secondsBetweenDates({ d2: timeStarted })));
      timer.timeEnds = new Date(timeStarted);
      timer.timeEnds.setSeconds(timer.timeEnds.getSeconds() + timer.secondsSet);
      setOfTimers.push(timer);
    }
  });
  setOfTimers.sort((a, b) => {
    return a.timeLeft - b.timeLeft;
  });
  return setOfTimers;
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
  return JSON.parse(readFileSync(DATAPATH, "utf8"));
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
  checkForOverlyLoudAlert,
  createCustomTimer,
  deleteCustomTimer,
  ensureCTFileExists,
  getTimers,
  readCustomTimers,
  renameTimer,
  renameCustomTimer,
  startTimer,
  stopTimer,
};
