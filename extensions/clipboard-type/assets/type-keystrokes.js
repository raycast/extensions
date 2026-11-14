// JavaScript for Automation (JXA) script run by `osascript -l JavaScript`.
// Reads a JSON payload from stdin (see `ScriptPayload` in src/lib/typing-script.ts) and plays back the keystrokes.
/* global $, ObjC, Application */

ObjC.import("AppKit");
ObjC.import("CoreGraphics");
// Not exposed by ObjC.import; checks whether this process (attributed to Raycast) may post keyboard events.
ObjC.bindFunction("CGPreflightPostEventAccess", ["bool", []]);

function readPayload() {
  const data = $.NSFileHandle.fileHandleWithStandardInput.readDataToEndOfFile;
  return JSON.parse($.NSString.alloc.initWithDataEncoding(data, $.NSUTF8StringEncoding).js);
}

const payload = readPayload();
const escapeKeyCode = 53;
const stopCheckInterval = 0.01;
const fileManager = $.NSFileManager.defaultManager;
const workspace = $.NSWorkspace.sharedWorkspace;
const runLoop = $.NSRunLoop.currentRunLoop;
let watchingFrontmostApp = false;
let targetAppPid;
let systemEvents;
let stopReason = null;

function sendMessage(type, value) {
  console.log(payload.messagePrefix + type + ":" + value);
}

// Nothing is frontmost for a moment during some app transitions, so that alone doesn't count as a switch.
function frontmostAppChanged() {
  const pid = workspace.frontmostApplication.processIdentifier;
  if (pid === undefined) return false;
  if (targetAppPid === undefined) targetAppPid = pid;
  return pid !== targetAppPid;
}

function checkForStop() {
  if (stopReason) return;
  // Reads the physical keyboard only, so keystrokes this script posts are never mistaken for the user's.
  if ($.CGEventSourceKeyState($.kCGEventSourceStateHIDSystemState, escapeKeyCode)) {
    stopReason = "escape";
  } else if (watchingFrontmostApp && frontmostAppChanged()) {
    stopReason = "app-switch";
  } else if (fileManager.fileExistsAtPath(payload.stopFile)) {
    stopReason = "requested";
  }
}

// Sleeps in short slices so a quick Esc tap is noticed even during long holds and pauses.
// Key holds aren't interruptible, so a key that's already down is always fully typed and released.
// Sleeps until a deadline rather than counting down slices, because macOS oversleeps each slice by ~25%.
// Runs the run loop rather than calling `delay()`, because NSWorkspace only updates the frontmost app while it runs.
function sleep(seconds, interruptible) {
  if (seconds <= 0) return;
  const deadline = $.CFAbsoluteTimeGetCurrent() + seconds;
  for (;;) {
    checkForStop();
    if (interruptible && stopReason) return;
    const remaining = deadline - $.CFAbsoluteTimeGetCurrent();
    if (remaining <= 0) return;
    runLoop.runUntilDate($.NSDate.dateWithTimeIntervalSinceNow(Math.min(stopCheckInterval, remaining)));
  }
}

function postKey(keyCode, keyDown, withShift) {
  const event = $.CGEventCreateKeyboardEvent(null, keyCode, keyDown);
  // Flag the event itself as shifted so apps that read event flags see Shift even with short key holds.
  if (withShift) $.CGEventSetFlags(event, $.kCGEventFlagMaskShift);
  $.CGEventPost($.kCGHIDEventTap, event);
}

// Returns false if a stop was requested while Shift was held, in which case the character isn't typed.
function pressKey(keyCode, withShift) {
  try {
    if (withShift) {
      postKey(payload.shiftKeyCode, true, true);
      sleep(payload.keyHold);
      // The Shift wait can notice an app switch; don't send the character into whatever app is now in front.
      if (stopReason) return false;
    }

    postKey(keyCode, true, withShift);
    sleep(payload.keyHold);
    postKey(keyCode, false, withShift);
  } finally {
    if (withShift) {
      sleep(payload.keyHold);
      postKey(payload.shiftKeyCode, false, false);
    }
  }

  sleep(payload.keyHold);
  return true;
}

function typeText(text) {
  if (!systemEvents) systemEvents = Application("System Events");
  systemEvents.keystroke(text);
}

function pauseBetweenKeys() {
  const { gap, gapVariance } = payload;
  if (gap <= 0) return;
  sleep(gap * (1 + (Math.random() * 2 - 1) * gapVariance), true);
}

function typeKeystrokes() {
  sleep(payload.initialDelay, true);
  // Starts after the initial delay so Raycast has closed and the app being typed into is in front.
  watchingFrontmostApp = true;
  postKey(payload.shiftKeyCode, false, false);

  try {
    const { keystrokes } = payload;
    for (let index = 0; index < keystrokes.length; index++) {
      checkForStop();
      if (stopReason) break;

      const keystroke = keystrokes[index];
      if ("text" in keystroke) {
        typeText(keystroke.text);
      } else if (!pressKey(keystroke.keyCode, keystroke.shift)) {
        break;
      }
      sendMessage("progress", keystrokes.length - index - 1);
      pauseBetweenKeys();
    }

    if (stopReason) sendMessage("stopped", stopReason);
  } finally {
    postKey(payload.shiftKeyCode, false, false);
  }
}

// Without Accessibility permission, posted key events are silently dropped, so check before typing anything.
if ($.CGPreflightPostEventAccess()) {
  typeKeystrokes();
} else {
  sendMessage("error", "accessibility");
}
