import { closeMainWindow } from "@raycast/api";
import { runAppleScript } from "run-applescript";

function escapeStringForAppleScript(str: string) {
  return str.replace(/[\\"]/g, '\\$&');
}

export async function sentToSideNote(content: string) {
  const applescript = `
  tell application "SideNotes"
    set f to first folder
    make new note in f with properties { text: "${escapeStringForAppleScript(content.trim())}" }
  end tell
  `;
  await runAppleScriptSilently(applescript);
}

function naiveRound(num: number, decimalPlaces = 0) {
  const p = Math.pow(10, decimalPlaces);
  return Math.round(num * p) / p;
}

export function countToken(content: string) {
  const word_count = content.split(" ").length;
  const char_count = content.length;
  const tokens_count_word_est = word_count / 0.75;
  const tokens_count_char_est = char_count / 4.0;
  const token_est = (tokens_count_word_est + tokens_count_char_est) / 2;
  return Math.round(token_est);
}

export function estimatePrice(token_est: number) {
  return naiveRound((token_est * 0.002) / 10, 2);
}

export async function runAppleScriptSilently(appleScript: string) {
  await closeMainWindow();
  await runAppleScript(appleScript);
}
