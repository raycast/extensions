import path from "node:path";
import * as os from "node:os";
import * as fs from "fs-extra";
import { closeMainWindow, environment, open, getPreferenceValues } from "@raycast/api";
import { spawnSync } from "node:child_process";
import { isEmpty, showStickiesNotRunningHUD, truncate } from "./common-utils";
import { isStickiesRunning, newStickiesNote, showStickiesWindows, toggleStickiesWindows } from "./applescript-utils";
import { STICKIES_PATH } from "./constants";

const stickiesDir = path.join(os.homedir(), "Library/Containers/com.apple.Stickies/Data/Library/Stickies");
const stickiesTempDir = path.join(environment.supportPath, "temp");

export const getStickiesNotesCount = async () => {
  if (!(await fs.pathExists(stickiesDir))) {
    return 0;
  }
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
    console.error("Error occurred during rmSync:", err);
  }
  fs.mkdirSync(stickiesTempDir, { recursive: true });

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

function readRtf(): StickiesRtfd[] {
  if (!fs.pathExistsSync(stickiesDir)) {
    return [];
  }
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
    throw err instanceof Error ? err : new Error(String(err));
  }
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
        if (fs.existsSync(outputFilePath)) {
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
  try {
    const sortedRtfdItems = readRtf();
    rtfToTxt(sortedRtfdItems);
    return readTxt(sortedRtfdItems);
  } catch (err) {
    console.error("Error reading Stickies directory:", err);
    throw err instanceof Error ? err : new Error(String(err));
  }
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
    const { autoOpen } = getPreferenceValues<Preferences>();
    if (autoOpen) {
      await open(STICKIES_PATH);
      await showStickiesWindows();
    } else {
      await showStickiesNotRunningHUD();
    }
  }
}
