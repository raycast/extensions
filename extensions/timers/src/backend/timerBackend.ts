import { environment, getPreferenceValues } from "@raycast/api";
import { exec } from "child_process";
import { randomUUID } from "crypto";
import { existsSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import { extname } from "path";
import { CustomTimer, Preferences, RawTimer, Timer, TimerLaunchConfig } from "./types";
import { formatTime, secondsBetweenDates } from "./formatUtils";
import { showHudOrToast, showInitialRingContinuouslyWarning } from "./utils";
import { kill } from "process";

const DATAPATH = environment.supportPath + "/customTimers.json";
const DEFAULT_PRESET_VISIBLES_FILE = environment.supportPath + "/defaultPresetVisibles.json";

const silentFileDeletion = (fp: string) => {
  try {
    unlinkSync(fp);
  } catch (err) {
    // only throw if it's not a "file doesn't exist" error
    if (err instanceof Error && !err.message.includes("ENOENT")) throw err;
  }
};

const checkForOverlyLoudAlert = (launchedFromMenuBar = false) => {
  const prefs = getPreferenceValues<Preferences>();
  if (parseFloat(prefs.volumeSetting) > 5.0) {
    const errorMsg = "Timer alert volume should not be louder than 5 (it can get quite loud!)";
    showHudOrToast({ msg: errorMsg, launchedFromMenuBar: launchedFromMenuBar, isErr: true });
    return false;
  }
  return true;
};

async function startTimer({
  timeInSeconds,
  timerName = "Untitled",
  launchedFromMenuBar = false,
  selectedSound = "default",
}: TimerLaunchConfig) {
  if (!(await showInitialRingContinuouslyWarning())) return;
  const fileName = environment.supportPath + "/" + new Date().toISOString() + "---" + timeInSeconds + ".timer";
  const masterName = fileName.replace(/:/g, "__");

  const prefs = getPreferenceValues<Preferences>();
  if (prefs.ringContinuously) {
    const dismissFile = `${masterName}`.replace(".timer", ".dismiss");
    writeFileSync(dismissFile, ".dismiss file for Timers");
  }

  const cmd = buildTimerCommand(masterName, timerName, timeInSeconds, selectedSound);

  const process = exec(cmd, (error, stderr) => {
    if (error) {
      console.log(`error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.log(`stderr: ${stderr}`);
      return;
    }
  });

  const fileContents: RawTimer = {
    name: timerName,
    pid: process.pid,
    lastPaused: "---",
    pauseElapsed: 0,
    selectedSound: selectedSound === "default" ? prefs.selectedSound : selectedSound,
  };
  writeFileSync(masterName, JSON.stringify(fileContents));
  showHudOrToast({
    msg: `Timer "${timerName}" started for ${formatTime(timeInSeconds)}!`,
    launchedFromMenuBar: launchedFromMenuBar,
    isErr: false,
  });
}

function buildTimerCommand(
  masterName: string,
  timerName: string,
  timeInSeconds: number,
  selectedSound: string,
): string {
  const prefs = getPreferenceValues<Preferences>();
  const selectedSoundPath = `${
    environment.assetsPath + "/" + (selectedSound === "default" ? prefs.selectedSound : selectedSound)
  }`;
  const cmdParts = [`sleep ${timeInSeconds}`];
  cmdParts.push(
    `if [ -f "${masterName}" ]; then osascript -e 'display notification "Timer \\"${timerName}\\" complete" with title "Ding!"'`,
  );
  const alertSoundString =
    prefs.selectedSound === "speak_timer_name"
      ? `say ${timerName}`
      : `afplay "${selectedSoundPath}" --volume ${prefs.volumeSetting.replace(",", ".")}`;
  cmdParts.push(alertSoundString);
  if (prefs.ringContinuously) {
    const dismissFile = `${masterName}`.replace(".timer", ".dismiss");
    cmdParts.push(`while [ -f "${dismissFile}" ]; do ${alertSoundString}; done`);
  }
  cmdParts.push(`rm "${masterName}"; else echo "Timer deleted"; fi`);
  return cmdParts.join(" ; ");
}

function stopTimer(timerFile: string) {
  const timerFilePath = environment.supportPath + "/" + timerFile;
  const dismissFile = timerFilePath.replace(".timer", ".dismiss");
  silentFileDeletion(timerFilePath);
  silentFileDeletion(dismissFile);
}

function pauseTimer(timerFile: string, timerPid: number) {
  const timerFilePath = environment.supportPath + "/" + timerFile;
  kill(timerPid);

  const rawFileContents = readFileSync(timerFilePath).toString();
  const fileContents: RawTimer = JSON.parse(rawFileContents);
  fileContents.pid = undefined;
  fileContents.lastPaused = new Date();
  writeFileSync(timerFilePath, JSON.stringify(fileContents));
}

function unpauseTimer(timer: Timer) {
  const timerFilePath = environment.supportPath + "/" + timer.originalFile;

  const cmd = buildTimerCommand(timerFilePath, timer.name, timer.timeLeft, timer.selectedSound);
  const process = exec(cmd);

  const rawFileContents = readFileSync(timerFilePath).toString();
  const fileContents: RawTimer = JSON.parse(rawFileContents);
  fileContents.pauseElapsed = fileContents.pauseElapsed + secondsBetweenDates({ d2: timer.lastPaused });
  fileContents.lastPaused = "---";
  fileContents.pid = process.pid;
  writeFileSync(timerFilePath, JSON.stringify(fileContents));
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
        pid: undefined,
        lastPaused: "---",
        pauseElapsed: 0,
        selectedSound: "default",
      };
      const rawFileContents = readFileSync(environment.supportPath + "/" + timerFile).toString();
      try {
        const fileContents: RawTimer = JSON.parse(rawFileContents);
        timer.name = fileContents.name;
        timer.pid = fileContents.pid;
        timer.lastPaused = fileContents.lastPaused;
        timer.pauseElapsed = fileContents.pauseElapsed;
        timer.selectedSound = fileContents.selectedSound;
      } catch (error) {
        if (!(error instanceof SyntaxError)) throw error;
        timer.name = rawFileContents;
      }

      const timerFileParts = timerFile.split("---");
      timer.secondsSet = Number(timerFileParts[1].split(".")[0]);
      const timeStarted = timerFileParts[0].replace(/__/g, ":");
      timer.timeEnds = new Date(timeStarted);
      timer.timeEnds.setSeconds(timer.timeEnds.getSeconds() + timer.secondsSet + timer.pauseElapsed);
      timer.timeLeft = Math.max(
        0,
        Math.round(
          timer.pid === undefined
            ? timer.secondsSet -
                secondsBetweenDates({
                  d1: timer.lastPaused === "---" ? undefined : timer.lastPaused,
                  d2: new Date(timeStarted),
                }) +
                timer.pauseElapsed
            : secondsBetweenDates({ d1: timer.timeEnds }),
        ),
      );
      setOfTimers.push(timer);
    }
  });
  setOfTimers.sort((a, b) => {
    return a.timeLeft - b.timeLeft;
  });
  return setOfTimers;
}

function renameTimer(timerFile: string, newName: string) {
  const timerFilePath = environment.supportPath + "/" + timerFile;
  const rawFileContents = readFileSync(timerFilePath).toString();
  const fileContents: RawTimer = JSON.parse(rawFileContents);
  fileContents.name = newName;
  writeFileSync(timerFilePath, JSON.stringify(fileContents));
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
  const res: Record<string, CustomTimer> = JSON.parse(readFileSync(DATAPATH, "utf8"));
  return Object.fromEntries(
    Object.entries(res).map(([ctID, timer]) =>
      timer.showInMenuBar === undefined ? [ctID, { ...timer, showInMenuBar: true }] : [ctID, timer],
    ),
  );
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

function toggleCustomTimerMenubarVisibility(ctID: string) {
  ensureCTFileExists();
  const customTimers = JSON.parse(readFileSync(DATAPATH, "utf8"));
  const currentVisibility = customTimers[ctID].showInMenuBar;
  customTimers[ctID].showInMenuBar = currentVisibility === undefined ? false : !currentVisibility;
  writeFileSync(DATAPATH, JSON.stringify(customTimers));
}

const readDefaultPresetVisibles = (): Record<string, boolean> => {
  if (!existsSync(DEFAULT_PRESET_VISIBLES_FILE)) {
    const defaultPresetVisibles = {
      "2M": true,
      "5M": true,
      "10M": true,
      "15M": true,
      "30M": true,
      "45M": true,
      "60M": true,
      "90M": true,
    };
    writeFileSync(DEFAULT_PRESET_VISIBLES_FILE, JSON.stringify(defaultPresetVisibles));
    return defaultPresetVisibles;
  }
  const res: Record<string, boolean> = JSON.parse(readFileSync(DEFAULT_PRESET_VISIBLES_FILE, "utf8"));
  return res;
};

const toggleDefaultPresetVisibility = (key: string) => {
  const data: Record<string, boolean> = JSON.parse(readFileSync(DEFAULT_PRESET_VISIBLES_FILE, "utf8"));
  data[key] = !data[key];
  writeFileSync(DEFAULT_PRESET_VISIBLES_FILE, JSON.stringify(data));
};

export {
  checkForOverlyLoudAlert,
  createCustomTimer,
  deleteCustomTimer,
  ensureCTFileExists,
  getTimers,
  readCustomTimers,
  renameTimer,
  renameCustomTimer,
  toggleCustomTimerMenubarVisibility,
  startTimer,
  stopTimer,
  pauseTimer,
  unpauseTimer,
  readDefaultPresetVisibles,
  toggleDefaultPresetVisibility,
};
