import { environment, popToRoot, showHUD } from "@raycast/api";
import { execSync } from "child_process";
import { readdirSync, readFileSync, writeFileSync } from "fs";
import { extname } from "path";
import { Stopwatch } from "./types";

const getStopwatches = () => {
  const setOfStopwatches: Stopwatch[] = [];
  const files = readdirSync(environment.supportPath);
  files.forEach((swFile: string) => {
    if (extname(swFile) == ".stopwatch") {
      const stopwatch: Stopwatch = {
        name: "",
        timeStarted: new Date(),
        timeElapsed: -99,
        originalFile: swFile,
      };
      stopwatch.name = readFileSync(environment.supportPath + "/" + swFile).toString();
      const timeStarted = swFile.replace(/__/g, ":").replace(".stopwatch", "");
      stopwatch.timeStarted = new Date(timeStarted);
      stopwatch.timeElapsed = Math.max(0, Math.round(new Date().getTime() - new Date(timeStarted).getTime()) / 1000);
      setOfStopwatches.push(stopwatch);
    }
  });
  setOfStopwatches.sort((a, b) => {
    return a.timeElapsed - b.timeElapsed;
  });
  return setOfStopwatches;
};

const startStopwatch = async (swName = "Untitled") => {
  const fileName = environment.supportPath + "/" + new Date().toISOString() + ".stopwatch";
  const masterName = fileName.replace(/:/g, "__");
  writeFileSync(masterName, swName);

  popToRoot();
  await showHUD(`Stopwatch "${swName}" started! 🎉`);
};

const stopStopwatch = (swFile: string) => {
  const command = `if [ -f "${swFile}" ]; then rm "${swFile}"; else echo "Timer deleted"; fi`;
  execSync(command);
};

export { getStopwatches, startStopwatch, stopStopwatch };
