import { execFile } from "node:child_process";
import { Clipboard, getPreferenceValues, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

const keyCodes = {
  a: 0,
  b: 11,
  c: 8,
  d: 2,
  e: 14,
  f: 3,
  g: 5,
  h: 4,
  i: 34,
  j: 38,
  k: 40,
  l: 37,
  m: 46,
  n: 45,
  o: 31,
  p: 35,
  q: 12,
  r: 15,
  s: 1,
  t: 17,
  u: 32,
  v: 9,
  w: 13,
  x: 7,
  y: 16,
  z: 6,
  "1": 18,
  "2": 19,
  "3": 20,
  "4": 21,
  "5": 23,
  "6": 22,
  "7": 26,
  "8": 28,
  "9": 25,
  "0": 29,
  "-": 27,
  "=": 24,
  "[": 33,
  "]": 30,
  "\\": 42,
  ";": 41,
  "'": 39,
  ",": 43,
  ".": 47,
  "/": 44,
  "`": 50,
  " ": 49,
} as const;

const shiftedKeyCodes = {
  A: 0,
  B: 11,
  C: 8,
  D: 2,
  E: 14,
  F: 3,
  G: 5,
  H: 4,
  I: 34,
  J: 38,
  K: 40,
  L: 37,
  M: 46,
  N: 45,
  O: 31,
  P: 35,
  Q: 12,
  R: 15,
  S: 1,
  T: 17,
  U: 32,
  V: 9,
  W: 13,
  X: 7,
  Y: 16,
  Z: 6,
  "!": 18,
  "@": 19,
  "#": 20,
  $: 21,
  "%": 23,
  "^": 22,
  "&": 26,
  "*": 28,
  "(": 25,
  ")": 29,
  _: 27,
  "+": 24,
  "{": 33,
  "}": 30,
  "|": 42,
  ":": 41,
  '"': 39,
  "<": 43,
  ">": 47,
  "?": 44,
  "~": 50,
} as const;

const shiftKeyCode = 56;
const returnKeyCode = 36;
const tabKeyCode = 48;
const keyEventDelaySeconds = 0.05;

function runJavaScriptForAutomation(script: string) {
  return new Promise<void>((resolve, reject) => {
    execFile("/usr/bin/osascript", ["-l", "JavaScript", "-e", script], (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

function buildReleaseShiftScript() {
  return `
ObjC.import("CoreGraphics");
const shiftUpEvent = $.CGEventCreateKeyboardEvent(null, ${shiftKeyCode}, false);
$.CGEventPost($.kCGHIDEventTap, shiftUpEvent);
`;
}

export default async function Command() {
  const latestClipboardItem = await Clipboard.readText();

  if (!latestClipboardItem) {
    await showFailureToast("Clipboard is empty");
    return;
  }

  await showHUD("Typing Clipboard...");
  const { humanCadence, humanCadenceSpeed, softNewlines } = getPreferenceValues<Preferences>();

  const humanCadenceSpeeds = {
    "very-slow": { min: 0.1, max: 0.3 },
    slow: { min: 0.05, max: 0.15 },
    average: { min: 0.02, max: 0.1 },
    fast: { min: 0.01, max: 0.05 },
    "very-fast": { min: 0.005, max: 0.02 },
    "super-human": { min: 0, max: 0 },
  };

  const humanCadenceRange = humanCadenceSpeeds[humanCadenceSpeed];
  const automationScript = `
ObjC.import("AppKit");
ObjC.import("CoreGraphics");

const systemEvents = Application("System Events");
const keyCodes = ${JSON.stringify(keyCodes)};
const shiftedKeyCodes = ${JSON.stringify(shiftedKeyCodes)};
const shiftKeyCode = ${shiftKeyCode};
const returnKeyCode = ${returnKeyCode};
const tabKeyCode = ${tabKeyCode};
const keyEventDelay = ${keyEventDelaySeconds};
const humanCadence = ${humanCadence};
const cadenceMin = ${humanCadenceRange.min};
const cadenceMax = ${humanCadenceRange.max};
const softNewlines = ${softNewlines};

function postKey(keyCode, keyDown) {
  const event = $.CGEventCreateKeyboardEvent(null, keyCode, keyDown);
  $.CGEventPost($.kCGHIDEventTap, event);
}

function pressKey(keyCode, withShift) {
  if (withShift) {
    postKey(shiftKeyCode, true);
    delay(keyEventDelay);
  }

  try {
    postKey(keyCode, true);
    delay(keyEventDelay);
    postKey(keyCode, false);
  } finally {
    if (withShift) {
      delay(keyEventDelay);
      postKey(shiftKeyCode, false);
    }
  }

  delay(keyEventDelay);
}

function applyCadence() {
  if (!humanCadence) return;
  delay(cadenceMin + Math.random() * (cadenceMax - cadenceMin));
}

const clipboardValue = $.NSPasteboard.generalPasteboard.stringForType($.NSPasteboardTypeString);
const text = ObjC.unwrap(clipboardValue) || "";

delay(0.3);
postKey(shiftKeyCode, false);

try {
  for (const character of text) {
    if (character === "\\r" || character === "\\n") {
      pressKey(returnKeyCode, softNewlines);
    } else if (character === "\\t") {
      pressKey(tabKeyCode, false);
    } else if (Object.prototype.hasOwnProperty.call(shiftedKeyCodes, character)) {
      pressKey(shiftedKeyCodes[character], true);
    } else if (Object.prototype.hasOwnProperty.call(keyCodes, character)) {
      pressKey(keyCodes[character], false);
    } else {
      systemEvents.keystroke(character);
    }
    applyCadence();
  }
} finally {
  postKey(shiftKeyCode, false);
}
`;

  try {
    await runJavaScriptForAutomation(automationScript);
    await showHUD("Finished Typing Clipboard");
  } catch (error) {
    await showFailureToast(error);
  } finally {
    await runJavaScriptForAutomation(buildReleaseShiftScript()).catch(() => undefined);
  }
}
