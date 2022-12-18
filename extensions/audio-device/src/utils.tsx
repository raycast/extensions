import airplayer from "airplayer";
import { runAppleScript } from "run-applescript";
import { isGreaterThanOrEqualTo } from "macos-version";
import { systemProfiler as asp } from "apple-system-profiler";

import { getOutputDevices as getDevicesFromBinary } from "./audio-device";

const isVentura = isGreaterThanOrEqualTo("13");

/* This file is mostly a duplicate of some of the functionality of helpers.tsx.
 * We do it this way in order to support AirPlay, which don't show up when
 * using helpers.tsx.
 *
 * In Ventura (macOS 13), the settings menu was redesigned, so we have two scripts to
 * do the same thing based on the version.
 *
 * (Note: Currently the Ventura version visually opens up the Settings. I'm not sure if there's
 * a way around it, or if there's no way around it.)
 */

function sliceIntoChunks(arr: Array<string>, chunkSize: number): Array<Array<string>> {
  const res = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    const chunk = arr.slice(i, i + chunkSize);
    res.push(chunk);
  }
  return res;
}

export async function getOutputDevices() {
  /* We get output devices from 3 sources...
   * - the audio-device binary included in this repo
   * - Airplay
   * - Bluetooth.
   * This seems to get them all!
   */

  const results = await Promise.all([listDevicesFromBinary(), listDevicesFromAirplay(), listDevicesFromBluetooth()]);
  let allResults = [...results[0], ...results[1], ...results[2]];

  // Filter out duplicates (some show up in bluetooth + device)
  allResults = allResults.filter((v, i, a) => a.findIndex((v2) => v2.name === v.name) === i);

  // Sort it alphabetically
  return allResults.sort((a, b) => (a.name > b.name ? 1 : -1));
}

async function listDevicesFromBinary() {
  const devices = await getDevicesFromBinary();
  return devices.map((d) => ({
    name: d.name,
    type: d.transportType,
    selected: false,
  }));
}

async function listDevicesFromAirplay() {
  // This is async, and I don't know if there's a way to make
  // it synchronous. So we do a 3-second timeout :/

  const list = airplayer();
  const out = [];
  list.on("update", function (player) {
    out.push({
      name: player.name,
      type: "airplay",
      selected: false,
    });
  });

  // Hacky, but I don't know if there's a better way to do this
  await new Promise((resolve) => setTimeout(resolve, 3000));

  return out;
}

async function listDevicesFromBluetooth() {
  const bt = await asp({
    dataTypes: ["SPBluetoothDataType"],
  });
  const headphones = bt[0].items.device_connected.map((k, v) => ({
    name: Object.keys(k)[0],
    isHeadphones: bt[0].items.device_connected[v][Object.keys(k)[0]].device_minorType === "Headphones",
    type: "bluetooth",
    selected: false,
  }));
  return headphones.filter((d) => d.isHeadphones);
}

export async function setOutputDevice(item: string) {
  await runAppleScript(
    isVentura
      ? `
    tell application "System Settings"
      activate
      tell application "System Events" to tell application process "System Settings"
        repeat until exists window 1
          delay 0.3
        end repeat
        set selected of row 9 of outline 1 of scroll area 1 of group 1 of splitter group 1 of group 1 of window 1 to true
        repeat until exists window "Sound"
          delay 0.3
        end repeat
        if value of radio button 1 of tab group 1 of group 2 of scroll area 1 of group 1 of group 2 of splitter group 1 of group 1 of window "Sound" is not 1 then
          click radio button 1 of tab group 1 of group 2 of scroll area 1 of group 1 of group 2 of splitter group 1 of group 1 of window "Sound"
          repeat until value of radio button 1 of tab group 1 of group 2 of scroll area 1 of group 1 of group 2 of splitter group 1 of group 1 of window "Sound" is 1
            delay 0.3
          end repeat
        end if
        set theRows to rows of table 1 of scroll area 1 of group 2 of scroll area 1 of group 1 of group 2 of splitter group 1 of group 1 of window "Sound"
        repeat with r in theRows
          if (value of static text of group 1 of UI element 1 of r as string) is "${item}" then
            set selected of r to true
            exit repeat
          end if
        end repeat
      end tell
    end tell

    if application "System Settings" is running then
      tell application "System Settings" to quit
    end if`
      : `
    tell application "System Preferences"
      reveal pane id "com.apple.preference.sound"
    end tell
    tell application "System Events"
      tell application process "System Preferences"
        repeat until exists tab group 1 of window "Sound"
        end repeat
        tell tab group 1 of window "Sound"
          click radio button "Output"
          tell table 1 of scroll area 1
            select (row 1 where value of text field 1 is "${item}")
          end tell
        end tell
      end tell
    end tell

    if application "System Preferences" is running then
      tell application "System Preferences" to quit
    end if
  `
  );
}
