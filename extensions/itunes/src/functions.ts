import { closeMainWindow, getPreferenceValues, popToRoot, showHUD, showToast, ToastStyle } from "@raycast/api";
import { execSync } from "child_process";
import fs from "fs";
import readline from "readline";
import os from "os";

interface runScriptProps {
  name?: string;
  album: string;
  artist: string;
}

interface Preferences {
  path: string;
  wait: number;
}

interface searchEntry {
  name: string;
  artist: string;
  album: string;
}

const preferences: Preferences = getPreferenceValues();
const using = "iTunes";
const XMLPath = preferences.path.replace(/^\s/, "").replace(/^~/, os.homedir());

function testXML(): boolean {
  if (!fs.existsSync(XMLPath)) {
    showToast(
      ToastStyle.Failure,
      "Library XML File Not Found",
      "Please correct the XML file path in extension preferences."
    );
    return false;
  }
  return true;
}

function iTunesRunning() {
  let up = false;
  try {
    up = execSync("/bin/ps -ef|/usr/bin/grep iTunes|/usr/bin/grep -v grep").toString().length > 0;
  } catch (error) {
    up = false;
  }

  return up;
}

async function cue(props: runScriptProps) {
  const escapingNames = {
    name: props.name || "",
    album: props.album.replace(/"/g, `\\"`),
    artist: props.artist.replace(/"/g, `\\"`),
  };

  if (!iTunesRunning()) {
    showToast(ToastStyle.Animated, "iTunes Not Running, Launching...");
    execSync(`osascript -e "launch application \\"/Applications/iTunes.app\\""`);
    waitUntil(iTunesRunning);
    showToast(ToastStyle.Animated, `Waiting for ${preferences.wait}s to Get iTunes Ready...`);
    await sleep(preferences.wait * 1000);
  }
  try {
    if (props.name) {
      execSync(
        `osascript -e "tell application \\"${using}\\" to play (the first track of library playlist 1 whose album is \\"${escapingNames.album}\\" and name is \\"${escapingNames.name}\\")"`
      );
    } else {
      execSync(`osascript \
         -e "tell application \\"${using}\\"" \
         -e "if (exists playlist \\"ExtensionAlbumPlaying\\") then" \
         -e "delete playlist \\"ExtensionAlbumPlaying\\"" \
         -e "end if" \
         -e "set name of (make new playlist) to \\"ExtensionAlbumPlaying\\"" \
         -e "set theseTracks to every track of library playlist 1 whose album is \\"${escapingNames.album}\\" and artist is \\"${escapingNames.artist}\\"" \
         -e "repeat with thisTrack in theseTracks" \
         -e "duplicate thisTrack to playlist \\"ExtensionAlbumPlaying\\"" \
         -e "end repeat" \
         -e "play playlist \\"ExtensionAlbumPlaying\\"" \
         -e "end tell"`);
    }
  } catch (error) {
    console.error("execution error", error);
    showToast(
      ToastStyle.Failure,
      "Failed to play the track",
      "Maybe the song is not in your library or has a weird title"
    );
    return;
  } finally {
    showHUD("Done");
  }

  popToRoot();
  closeMainWindow({ clearRootSearch: true });
}
async function performSearch(searchText: string, type: "song" | "album", signal: AbortSignal) {
  if (searchText.length < 2) return [];
  let match: searchEntry[] = [];
  let sherlock = false;
  let dictBlock = false;
  const emptyBuffer = {
    album: "",
    artist: "",
    name: "",
  };
  let buffer = Object.assign({}, emptyBuffer);
  match = [];

  const read = readline.createInterface({
    input: fs.createReadStream(XMLPath),
    output: process.stdout,
    terminal: false,
  });
  read.on("line", (line) => {
    if (line.indexOf("</dict>") >= 0) {
      dictBlock = false;

      switch (type) {
        case "song":
          if (buffer.name.length > 0 && buffer.name.toLowerCase().indexOf(searchText.toLowerCase()) >= 0) {
            match = [...match, buffer];
          }
          buffer = Object.assign({}, emptyBuffer);
          break;
        case "album":
          if (
            match.filter((entry) => {
              return entry.artist === buffer.artist && entry.album === buffer.album;
            }).length === 0 &&
            buffer.album.length > 0 &&
            buffer.album.toLowerCase().indexOf(searchText.toLowerCase()) >= 0
          ) {
            match = [...match, buffer];
          }
          buffer = Object.assign({}, emptyBuffer);
          break;
      }
    }

    if (line.indexOf("<dict>") >= 0) {
      dictBlock = true;
      return;
    }

    if (dictBlock) {
      const [key, value] = [
        line.match(/(?<=<key>).*?(?=<\/key>)/) || [],
        line.match(/(?<=<string>).*?(?=<\/string>)/) || "",
      ];
      if (key[0] === "Name") {
        buffer.name = value[0];
      }
      if (key[0] === "Artist") {
        buffer.artist = value[0];
      }
      if (key[0] === "Album") {
        buffer.album = value[0];
      }
    }
  });
  read.on("close", () => {
    match = Array.from(new Set(match));
    sherlock = true;
  });
  await waitUntil(() => sherlock || signal.aborted);

  return match;
}

const waitUntil = (condition: () => boolean) => {
  return new Promise<void>((resolve) => {
    const interval = setInterval(() => {
      if (!condition()) {
        return;
      }
      clearInterval(interval);
      resolve();
    }, 100);
  });
};

const sleep = (duration: number) => {
  return new Promise((resolve) => setTimeout(resolve, duration));
};

export { testXML, cue, performSearch };
