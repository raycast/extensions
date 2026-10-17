import { environment, getPreferenceValues } from "@raycast/api";
import { exec } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import { CustomTimer, Preferences, RawTimer, Timer, TimerLaunchConfig } from "./types";
import { formatTime, secondsBetweenDates } from "./formatUtils";
import { showHudOrToast, showInitialRingContinuouslyWarning } from "./utils";
import { kill } from "node:process";
import { writeTimerFile } from "./timerStorage";
import { alertVolume, ensureWindowsWorker, windowsWorkerConfig } from "./windowsBackend";
import { getErrorMessage } from "@chrismessina/raycast-kit/errors";
import { buildMacTimerCommand } from "./macosTimer";

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
  try {
    alertVolume(prefs.volumeSetting);
  } catch (error) {
    const errorMsg = getErrorMessage(error);
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
  skipRingContinuouslyWarning = false,
}: TimerLaunchConfig) {
  if (
    !Number.isFinite(timeInSeconds) ||
    timeInSeconds <= 0 ||
    !Number.isSafeInteger(Math.ceil(timeInSeconds * 1000)) ||
    Date.now() + timeInSeconds * 1000 > 8640000000000000
  ) {
    throw new Error("Timer duration must be a positive, finite number within the supported date range");
  }
  if (!skipRingContinuouslyWarning) {
    if (!(await showInitialRingContinuouslyWarning())) return false;
  }
  const fileName =
    new Date().toISOString().replace(/:/g, "__") + "---" + timeInSeconds + "---" + randomUUID() + ".timer";
  const masterName = join(environment.supportPath, fileName);

  const prefs = getPreferenceValues<Preferences>();
  alertVolume(prefs.volumeSetting);
  if (process.platform === "win32") {
    const workerId = randomUUID();
    const sound = selectedSound === "default" ? prefs.selectedSound : selectedSound;
    const config = await windowsWorkerConfig(masterName, workerId, timeInSeconds, sound, prefs);
    const contents: RawTimer = {
      name: timerName,
      workerId,
      windows: config,
      pid: undefined,
      lastPaused: "---",
      pauseElapsed: 0,
      selectedSound: sound,
    };
    writeTimerFile(masterName, contents);
    try {
      const pid = await ensureWindowsWorker(config);
      // A very short timer may already have completed by the time startup returns.
      if (existsSync(masterName)) {
        const current: RawTimer = JSON.parse(readFileSync(masterName, "utf8"));
        if (current.workerId === workerId && current.lastPaused === "---")
          writeTimerFile(masterName, { ...current, pid });
      }
    } catch (error) {
      silentFileDeletion(masterName);
      silentFileDeletion(`${masterName}.error`);
      throw error;
    }
    await showHudOrToast({
      msg: `Timer "${timerName}" started for ${formatTime(timeInSeconds)}!`,
      launchedFromMenuBar,
      isErr: false,
    });
    return true;
  }
  if (prefs.ringContinuously) {
    const dismissFile = `${masterName}`.replace(".timer", ".dismiss");
    writeFileSync(dismissFile, ".dismiss file for Timers");
  }

  const cmd = buildTimerCommand(masterName, timerName, timeInSeconds, selectedSound);

  const child = exec(cmd, (error, stderr) => {
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
    pid: child.pid,
    lastPaused: "---",
    pauseElapsed: 0,
    selectedSound: selectedSound === "default" ? prefs.selectedSound : selectedSound,
  };
  writeTimerFile(masterName, fileContents);
  showHudOrToast({
    msg: `Timer "${timerName}" started for ${formatTime(timeInSeconds)}!`,
    launchedFromMenuBar: launchedFromMenuBar,
    isErr: false,
  });
  return true;
}

function buildTimerCommand(
  masterName: string,
  timerName: string,
  timeInSeconds: number,
  selectedSound: string,
): string {
  const prefs = getPreferenceValues<Preferences>();
  const sound = selectedSound === "default" ? prefs.selectedSound : selectedSound;
  return buildMacTimerCommand({
    timerFile: masterName,
    timerName,
    seconds: timeInSeconds,
    soundPath: join(environment.assetsPath, sound),
    speak: sound === "speak_timer_name",
    volume: alertVolume(prefs.volumeSetting),
    ringContinuously: prefs.ringContinuously,
  });
}

function stopTimer(timerFile: string) {
  const timerFilePath = environment.supportPath + "/" + timerFile;
  const dismissFile = timerFilePath.replace(".timer", ".dismiss");
  silentFileDeletion(timerFilePath);
  silentFileDeletion(dismissFile);
  silentFileDeletion(`${timerFilePath}.error`);
}

function pauseTimer(timerFile: string, timerPid: number) {
  const timerFilePath = environment.supportPath + "/" + timerFile;
  if (process.platform !== "win32") kill(timerPid);

  const rawFileContents = readFileSync(timerFilePath).toString();
  const fileContents: RawTimer = JSON.parse(rawFileContents);
  fileContents.pid = undefined;
  fileContents.lastPaused = new Date();
  writeTimerFile(timerFilePath, fileContents);
}

async function unpauseTimer(timer: Timer) {
  const timerFilePath = environment.supportPath + "/" + timer.originalFile;

  if (process.platform === "win32") {
    const contents: RawTimer = JSON.parse(readFileSync(timerFilePath, "utf8"));
    if (contents.lastPaused === "---") return;
    const workerId = randomUUID();
    const prefs = getPreferenceValues<Preferences>();
    const remaining = contents.windows
      ? Math.max(0, (contents.windows.deadline - new Date(contents.lastPaused).getTime()) / 1000)
      : timer.timeLeft;
    const config = await windowsWorkerConfig(timerFilePath, workerId, remaining, timer.selectedSound, prefs);
    if (!existsSync(timerFilePath)) return;
    const current: RawTimer = JSON.parse(readFileSync(timerFilePath, "utf8"));
    if (current.workerId !== contents.workerId || current.lastPaused !== contents.lastPaused) return;
    const next: RawTimer = {
      ...contents,
      workerId,
      windows: config,
      lastPaused: "---",
      pid: undefined,
      pauseElapsed: contents.pauseElapsed + secondsBetweenDates({ d2: timer.lastPaused }),
    };
    writeTimerFile(timerFilePath, next);
    try {
      const pid = await ensureWindowsWorker(config);
      if (existsSync(timerFilePath)) {
        const current: RawTimer = JSON.parse(readFileSync(timerFilePath, "utf8"));
        if (current.workerId === workerId && current.lastPaused === "---")
          writeTimerFile(timerFilePath, { ...current, pid });
      }
    } catch (error) {
      if (existsSync(timerFilePath)) {
        const current: RawTimer = JSON.parse(readFileSync(timerFilePath, "utf8"));
        if (current.workerId === workerId && current.lastPaused === "---") writeTimerFile(timerFilePath, contents);
      }
      throw error;
    }
    return;
  }

  const cmd = buildTimerCommand(timerFilePath, timer.name, timer.timeLeft, timer.selectedSound);
  const child = exec(cmd);

  const rawFileContents = readFileSync(timerFilePath).toString();
  const fileContents: RawTimer = JSON.parse(rawFileContents);
  fileContents.pauseElapsed = fileContents.pauseElapsed + secondsBetweenDates({ d2: timer.lastPaused });
  fileContents.lastPaused = "---";
  fileContents.pid = child.pid;
  writeTimerFile(timerFilePath, fileContents);
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
      let rawFileContents: string;
      try {
        rawFileContents = readFileSync(join(environment.supportPath, timerFile), "utf8");
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
        throw error;
      }
      try {
        const fileContents: RawTimer = JSON.parse(rawFileContents);
        timer.name = fileContents.name;
        timer.pid = fileContents.pid;
        timer.lastPaused = fileContents.lastPaused;
        timer.pauseElapsed = fileContents.pauseElapsed;
        timer.selectedSound = fileContents.selectedSound;
        timer.workerId = fileContents.workerId;
        const errorFile = join(environment.supportPath, `${timerFile}.error`);
        if (existsSync(errorFile)) timer.workerError = readFileSync(errorFile, "utf8");
      } catch (error) {
        if (!(error instanceof SyntaxError)) throw error;
        timer.name = rawFileContents;
      }

      const timerFileParts = timerFile.split("---");
      timer.secondsSet = Number(timerFileParts[1].replace(/\.timer$/, ""));
      const timeStarted = timerFileParts[0].replace(/__/g, ":");
      timer.timeEnds = new Date(timeStarted);
      timer.timeEnds.setSeconds(timer.timeEnds.getSeconds() + timer.secondsSet + timer.pauseElapsed);
      if (timer.workerId) {
        const raw: RawTimer = JSON.parse(rawFileContents);
        if (raw.windows) timer.timeEnds = new Date(raw.windows.deadline);
      }
      timer.timeLeft = Math.max(
        0,
        Math.round(
          timer.lastPaused !== "---" || (timer.pid === undefined && !timer.workerId)
            ? timer.secondsSet -
                secondsBetweenDates({
                  d1: timer.lastPaused === "---" ? undefined : timer.lastPaused,
                  d2: new Date(timeStarted),
                }) +
                timer.pauseElapsed
            : secondsBetweenDates({ d1: timer.timeEnds }),
        ),
      );
      if (timer.workerId) {
        const raw: RawTimer = JSON.parse(rawFileContents);
        if (raw.windows) {
          const at = timer.lastPaused === "---" ? Date.now() : new Date(timer.lastPaused).getTime();
          timer.timeLeft = Math.max(0, Math.round((raw.windows.deadline - at) / 1000));
        }
      }
      setOfTimers.push(timer);
    }
  });
  setOfTimers.sort((a, b) => {
    return a.timeLeft - b.timeLeft;
  });
  return setOfTimers;
}

let lastRecovery = 0;
let recoveryPending: Promise<void> | undefined;
async function recoverWindowsTimers() {
  if (process.platform !== "win32") return;
  if (recoveryPending) return recoveryPending;
  if (Date.now() - lastRecovery < 10000) return;
  lastRecovery = Date.now();
  recoveryPending = (async () => {
    for (const file of readdirSync(environment.supportPath).filter((file) => extname(file) === ".timer")) {
      const path = join(environment.supportPath, file);
      try {
        const raw: RawTimer = JSON.parse(readFileSync(path, "utf8"));
        if (raw.windows && raw.lastPaused === "---" && !existsSync(`${path}.error`))
          await ensureWindowsWorker(raw.windows);
      } catch (error) {
        if (existsSync(path)) writeFileSync(`${path}.error`, getErrorMessage(error));
      }
    }
  })();
  try {
    await recoveryPending;
  } finally {
    recoveryPending = undefined;
  }
}

function renameTimer(timerFile: string, newName: string) {
  const timerFilePath = environment.supportPath + "/" + timerFile;
  const rawFileContents = readFileSync(timerFilePath).toString();
  const fileContents: RawTimer = JSON.parse(rawFileContents);
  fileContents.name = newName;
  writeTimerFile(timerFilePath, fileContents);
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

function updateCustomTimer(ctID: string, changes: Pick<CustomTimer, "name" | "timeInSeconds" | "selectedSound">) {
  const customTimers = readCustomTimers();
  if (!customTimers[ctID]) throw new Error("This preset no longer exists");
  if (!changes.name.trim()) throw new Error("Enter a preset name");
  if (
    !Number.isFinite(changes.timeInSeconds) ||
    changes.timeInSeconds <= 0 ||
    !Number.isSafeInteger(Math.ceil(changes.timeInSeconds * 1000)) ||
    Date.now() + changes.timeInSeconds * 1000 > 8640000000000000
  )
    throw new Error("Enter a positive duration within the supported date range");
  customTimers[ctID] = { ...customTimers[ctID], ...changes, name: changes.name.trim() };
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
      "1M": true,
      "2M": true,
      "5M": true,
      "10M": true,
      "15M": true,
      "25M": true,
      "30M": true,
      "45M": true,
      "60M": true,
      "90M": true,
    };
    writeFileSync(DEFAULT_PRESET_VISIBLES_FILE, JSON.stringify(defaultPresetVisibles));
    return defaultPresetVisibles;
  }
  const res: Record<string, boolean> = JSON.parse(readFileSync(DEFAULT_PRESET_VISIBLES_FILE, "utf8"));
  return { "1M": true, "25M": true, ...res };
};

const toggleDefaultPresetVisibility = (key: string) => {
  const data = readDefaultPresetVisibles();
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
  updateCustomTimer,
  toggleCustomTimerMenubarVisibility,
  startTimer,
  stopTimer,
  pauseTimer,
  unpauseTimer,
  readDefaultPresetVisibles,
  toggleDefaultPresetVisibility,
  recoverWindowsTimers,
};
