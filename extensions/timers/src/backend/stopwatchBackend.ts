import { environment } from "@raycast/api";
import { execSync } from "child_process";
import { randomUUID } from "crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { extname } from "path";
import { secondsBetweenDates } from "./formatUtils";
import { Stopwatch, StopwatchLaunchConfig } from "./types";
import { showHudOrToast } from "./utils";

const SWPATH = environment.supportPath + "/raycast-stopwatches.json";

const ensureSWFileExists = () => {
  if (!existsSync(SWPATH) || readFileSync(SWPATH).toString() == "") {
    writeFileSync(SWPATH, "[]");
  }
};

const initStopwatch = (swName: string): Stopwatch => {
  return {
    name: swName,
    swID: randomUUID(),
    timeStarted: new Date(),
    timeElapsed: -99,
    lastPaused: "----",
    pauseElapsed: 0,
  };
};

const processStopwatches = (swSet: Stopwatch[]) => {
  swSet.map((x) => {
    if (x.lastPaused != "----") {
      x.timeElapsed = Math.max(0, secondsBetweenDates({ d1: x.lastPaused, d2: x.timeStarted }) - x.pauseElapsed);
    } else {
      const rawElapsedTime = Math.max(0, secondsBetweenDates({ d2: x.timeStarted }));
      x.timeElapsed = rawElapsedTime - x.pauseElapsed;
    }
  });
  return swSet;
};

const getStopwatches = () => {
  ensureSWFileExists();
  const rawStopwatches: Stopwatch[] = JSON.parse(readFileSync(SWPATH).toString());
  const fullStopwatchSet = cleanUpOldStopwatches(rawStopwatches);
  const setOfStopwatches = processStopwatches(fullStopwatchSet);
  setOfStopwatches.sort((a, b) => {
    return a.timeElapsed - b.timeElapsed;
  });
  return setOfStopwatches;
};

const startStopwatch = async ({ swName = "Untitled", launchedFromMenuBar = false }: StopwatchLaunchConfig) => {
  ensureSWFileExists();
  const swStore: Stopwatch[] = JSON.parse(readFileSync(SWPATH).toString());
  const newTimer = initStopwatch(swName);
  swStore.push(newTimer);
  writeFileSync(SWPATH, JSON.stringify(swStore));

  showHudOrToast({ msg: `Stopwatch "${swName}" started!`, launchedFromMenuBar: launchedFromMenuBar, isErr: false });
};

const pauseStopwatch = (swToPause: string) => {
  ensureSWFileExists();
  let swStore: Stopwatch[] = JSON.parse(readFileSync(SWPATH).toString());
  swStore = swStore.map((s) => (s.swID == swToPause ? { ...s, lastPaused: new Date() } : s));
  writeFileSync(SWPATH, JSON.stringify(swStore));
};

const unpauseStopwatch = (swToUnpause: string) => {
  ensureSWFileExists();
  let swStore: Stopwatch[] = JSON.parse(readFileSync(SWPATH).toString());
  swStore = swStore.map((s) =>
    s.swID == swToUnpause
      ? {
          ...s,
          pauseElapsed: s.pauseElapsed + secondsBetweenDates({ d2: s.lastPaused }),
          lastPaused: "----",
        }
      : s,
  );
  writeFileSync(SWPATH, JSON.stringify(swStore));
};

const stopStopwatch = (swToDelete: string) => {
  ensureSWFileExists();
  let swStore: Stopwatch[] = JSON.parse(readFileSync(SWPATH).toString());
  swStore = swStore.filter((s: Stopwatch) => s.swID !== swToDelete);
  writeFileSync(SWPATH, JSON.stringify(swStore));
};

const cleanUpOldStopwatches = (newStore: Stopwatch[]) => {
  const files = readdirSync(environment.supportPath);
  files.forEach((swFile: string) => {
    if (extname(swFile) == ".stopwatch") {
      const stopwatch = initStopwatch(readFileSync(environment.supportPath + "/" + swFile).toString());
      const timeStarted = swFile.replace(/__/g, ":").replace(".stopwatch", "");
      stopwatch.timeStarted = new Date(timeStarted);
      stopwatch.timeElapsed = Math.max(0, secondsBetweenDates({}));
      execSync(`rm "${environment.supportPath}/${swFile}"`);
      newStore.push(stopwatch);
    }
  });
  writeFileSync(SWPATH, JSON.stringify(newStore));
  return newStore;
};

const renameStopwatch = (swID: string, newName: string) => {
  ensureSWFileExists();
  const stopwatches: Stopwatch[] = JSON.parse(readFileSync(SWPATH, "utf8"));
  const renamedSW = stopwatches.map((x) => (x.swID == swID ? { ...x, name: newName } : x));
  writeFileSync(SWPATH, JSON.stringify(renamedSW));
};

export { getStopwatches, pauseStopwatch, unpauseStopwatch, startStopwatch, stopStopwatch, renameStopwatch };
