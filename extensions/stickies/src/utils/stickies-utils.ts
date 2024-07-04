import path from "node:path";
import * as os from "node:os";
import * as fs from "fs-extra";
import { closeMainWindow, environment, open } from "@raycast/api";
import { spawnSync } from "node:child_process";
import { isEmpty, showStickiesNotRunningHUD, truncate } from "./common-utils";
import { isStickiesRunning, newStickiesNote, showStickiesWindows, toggleStickiesWindows } from "./applescript-utils";
import { STICKIES_PATH } from "./constants";
import { autoOpen } from "../types/preference";

const stickiesDir = path.join(os.homedir(), "Library/Containers/com.apple.Stickies/Data/Library/Stickies");
const stickiesTempDir = path.join(environment.supportPath, "temp");

export const getStickiesNotesCount = async () => {
  const files = await fs.readdir(stickiesDir);
  return files.filter((file) => file.endsWith(".rtfd")).length;
};

export interface StickiesNote {
  name: string;
  path: string;
  title: string;
  content: string;
  rawPath: string;
  rawStat: fs.Stats;
}

interface StickiesRtfd {
  name: string;
  path: string;
  stat: fs.Stats;
}

// convert rtf to txt
function rtfToTxt(rtf: StickiesRtfd[]) {
  try {
    fs.rmSync(stickiesTempDir, { recursive: true, force: true });
  } catch (err) {
    console.error("Error occurred:", err);
  }
  fs.mkdirSync(stickiesTempDir);

  try {
    for (const rtfd of rtf) {
      try {
        const outputFilePath = path.join(stickiesTempDir, rtfd.name + ".txt");
        spawnSync("textutil", ["-convert", "txt", "-output", outputFilePath, rtfd.path]);
      } catch (error) {
        console.error(`Error converting`, error);
      }
    }
  } catch (error) {
    console.error(`Error converting`, error);
  }
  return rtf;
}

function readRtf() {
  const result: StickiesRtfd[] = [];
  try {
    const stickiesRtfds = fs.readdirSync(stickiesDir);
    const rtfdItems: StickiesRtfd[] = [];
    for (const rtfd of stickiesRtfds) {
      const rtfdPath = path.join(stickiesDir, rtfd);
      if (rtfdPath.endsWith(".rtfd")) {
        const stat = fs.statSync(rtfdPath);
        rtfdItems.push({ name: rtfd.replaceAll(".rtfd", ""), path: rtfdPath, stat: stat });
      }
    }
    return rtfdItems.sort((a, b) => b.stat.mtime.getTime() - a.stat.mtime.getTime());
  } catch (err) {
    console.error("Error reading Stickies directory:", err);
  }
  return result;
}

const getFirstLine = (text: string): string => {
  const firstNewLineIndex = text.indexOf("\n");
  if (firstNewLineIndex === -1) return text;
  return text.substring(0, firstNewLineIndex);
};

function readTxt(rtf: StickiesRtfd[]) {
  const stickiesTxts: StickiesNote[] = [];

  try {
    for (const rtfd of rtf) {
      try {
        const outputFilePath = path.join(stickiesTempDir, rtfd.name + ".txt");
        const content = fs.readFileSync(outputFilePath, "utf8").trim();
        if (!isEmpty(content)) {
          stickiesTxts.push({
            name: rtfd.name,
            path: outputFilePath,
            title: truncate(getFirstLine(content)),
            content: content,
            rawPath: rtfd.path,
            rawStat: rtfd.stat,
          });
        }
      } catch (error) {
        console.error(`Error converting`, error);
      }
    }
  } catch (e) {
    console.error("Error reading Stickies directory:", e);
  }
  return stickiesTxts;
}

export async function readStickies() {
  const result: StickiesNote[] = [];
  try {
    // read rtf files from Stickies directory
    const sortedRtfdItems = readRtf();
    // convert rtf to txt
    rtfToTxt(sortedRtfdItems);
    // read txt files
    return readTxt(sortedRtfdItems);
  } catch (err) {
    console.error("Error reading Stickies directory:", err);
  }
  return result;
}

export async function showStickies(isToggle: boolean = false) {
  await closeMainWindow();
  const stickiesRunning = isStickiesRunning();
  if (stickiesRunning) {
    const windowCount = await getStickiesNotesCount();
    if (windowCount > 0) {
      if (isToggle) {
        await toggleStickiesWindows();
      } else {
        await open(STICKIES_PATH);
        await showStickiesWindows();
      }
    } else {
      await newStickiesNote();
    }
  } else {
    if (autoOpen) {
      await open(STICKIES_PATH);
      await showStickiesWindows();
    } else {
      await showStickiesNotRunningHUD();
    }
  }
}
