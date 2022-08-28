import { Clipboard, environment, showHUD } from "@raycast/api";
import { readdirSync, readFileSync, writeFileSync, unlinkSync } from "fs";
import moment from "moment";
import { extname } from "path";

async function createAndStartStopwatch(stopwatchName = "Stopwatch") {
  const files = readdirSync(environment.supportPath);
  const directoryName = environment.supportPath + "/" + files.length + "---" + Date.now() + ".timer";
  const masterName = directoryName.replace(/:/g, "__");
  writeFileSync(masterName, stopwatchName);
}

async function stopAndCopyStopwatch() {
  const files = readdirSync(environment.supportPath);
  showHUD(files.length + " stopwatches found");
  files.forEach((stopwatchFile: string) => {
    if (extname(stopwatchFile) == ".timer") {
      const stopwatchFileParts = stopwatchFile.split("---");
      const timeElapsed = new Date(Date.now() - parseInt(stopwatchFileParts[1]));
      const elapsed = Date.now() - parseInt(stopwatchFileParts[1]);
      const elapsedFormatted = moment.utc(timeElapsed).format("HH:mm:ss");
      showHUD(`Time elapsed: ${elapsed}ms - ${elapsedFormatted}`);
      Clipboard.copy(elapsedFormatted);
      unlinkSync(`${environment.supportPath}/${stopwatchFile}`);
    }
  });
}

export { createAndStartStopwatch, stopAndCopyStopwatch };
