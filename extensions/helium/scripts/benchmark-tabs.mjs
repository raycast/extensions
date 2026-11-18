#!/usr/bin/env node
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const script = `
set fieldSep to character id 31
set recordSep to character id 30
tell application "Helium"
  if not running then return ""
  set output to {}
  repeat with w in windows
    try
      set tabIds to id of tabs of w
      set tabUrls to URL of tabs of w
      set tabTitles to title of tabs of w
      repeat with i from 1 to count of tabIds
        set end of output to (item i of tabIds as text) & fieldSep & (item i of tabUrls as text) & fieldSep & (item i of tabTitles as text)
      end repeat
    end try
  end repeat
  set AppleScript's text item delimiters to recordSep
  set s to output as text
  set AppleScript's text item delimiters to ""
  return s
end tell
`;

const startedAt = performance.now();
const { stdout } = await execFileAsync("osascript", ["-e", script], { timeout: 10000 });
const elapsed = performance.now() - startedAt;
const recordSep = String.fromCharCode(30);
const count = stdout.trim().length === 0 ? 0 : stdout.trim().split(recordSep).filter(Boolean).length;

console.log(JSON.stringify({ tabs: count, milliseconds: Math.round(elapsed) }, null, 2));
