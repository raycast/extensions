import { spawn } from "node:child_process";
import { Clipboard, closeMainWindow, getPreferenceValues, showToast, Toast } from "@raycast/api";
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
const progressPrefix = "__RAYCAST_CLIPBOARD_PROGRESS__:";

function runJavaScriptForAutomation(script: string, onProgress?: (remaining: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn("/usr/bin/osascript", ["-l", "JavaScript", "-e", script]);
    let errorOutput = "";
    let errorBuffer = "";

    const processErrorLine = (line: string) => {
      if (line.startsWith(progressPrefix)) {
        const remaining = Number.parseInt(line.slice(progressPrefix.length), 10);
        if (Number.isFinite(remaining)) onProgress?.(remaining);
      } else {
        errorOutput += `${line}\n`;
      }
    };

    child.stderr.on("data", (chunk: Buffer) => {
      errorBuffer += chunk.toString();
      const lines = errorBuffer.split("\n");
      errorBuffer = lines.pop() ?? "";
      lines.forEach(processErrorLine);
    });

    child.on("error", reject);
    child.on("close", (exitCode) => {
      if (errorBuffer) processErrorLine(errorBuffer);
      if (exitCode === 0) {
        resolve();
      } else {
        reject(new Error(errorOutput.trim() || `osascript exited with code ${exitCode}`));
      }
    });
  });
}

function formatClipboardPreview(characters: string[], remaining: number) {
  const nextCharacters = characters.slice(characters.length - remaining);
  const preview = nextCharacters
    .slice(0, 20)
    .map((character) =>
      character === "\n" ? "\\n" : character === "\r" ? "\\r" : character === "\t" ? "\\t" : character,
    )
    .join("");
  return `${preview}${nextCharacters.length > 20 ? "…" : ""}`;
}

function formatProgressTitle(characters: string[], remaining: number) {
  const preview = formatClipboardPreview(characters, remaining);
  return `Pasting ${preview}, ${remaining} ${remaining === 1 ? "character" : "characters"} remaining`;
}

function createProgressToast(characters: string[], toast: Toast) {
  let latestRemaining = 0;
  let updateTimer: ReturnType<typeof setTimeout> | undefined;

  const flush = () => {
    updateTimer = undefined;
    toast.title = formatProgressTitle(characters, latestRemaining);
  };

  return {
    update(remaining: number) {
      latestRemaining = remaining;
      updateTimer ??= setTimeout(flush, 100);
    },
    finish() {
      if (updateTimer) {
        clearTimeout(updateTimer);
        flush();
      }
    },
  };
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

  const clipboardCharacters = Array.from(latestClipboardItem);
  const characterCount = clipboardCharacters.length;
  await closeMainWindow();
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: formatProgressTitle(clipboardCharacters, characterCount),
  });
  const progressToast = createProgressToast(clipboardCharacters, toast);
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
const progressPrefix = ${JSON.stringify(progressPrefix)};

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
const characters = Array.from(text);

delay(0.3);
postKey(shiftKeyCode, false);

try {
  for (let index = 0; index < characters.length; index++) {
    const character = characters[index];
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
    console.log(progressPrefix + (characters.length - index - 1));
    applyCadence();
  }
} finally {
  postKey(shiftKeyCode, false);
}
`;

  try {
    await runJavaScriptForAutomation(automationScript, progressToast.update);
    progressToast.finish();
    toast.style = Toast.Style.Success;
    toast.title = "Pasting complete";
  } catch (error) {
    progressToast.finish();
    toast.style = Toast.Style.Failure;
    await showFailureToast(error);
  } finally {
    await runJavaScriptForAutomation(buildReleaseShiftScript()).catch(() => undefined);
  }
}
