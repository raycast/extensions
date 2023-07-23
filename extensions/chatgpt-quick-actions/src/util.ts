import { closeMainWindow } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { encode } from "@nem035/gpt-3-encoder";

function escapeStringForAppleScript(str: string) {
  return str.replace(/[\\"]/g, "\\$&");
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
  return encode(content).length;
}

export function estimatePrice(prompt_token: number, output_token: number, model: string) {
  // price is per 1K tokens, but we are measuing in cents. Hence the denominator is 10
  let price = 0;
  if (model == "gpt-3.5-turbo") {
    price = (prompt_token * 0.0015 + output_token * 0.002) / 10;
  } else if (model == "gpt-3.5-turbo-16k") {
    price = (prompt_token * 0.003 + output_token * 0.004) / 10;
  } else if (model == "gpt-4") {
    price = (prompt_token * 0.03 + output_token * 0.06) / 10;
  } else if (model == "gpt-4-32k-0613") {
    price = (prompt_token * 0.03 + output_token * 0.06) / 10;
  } else {
    return -1;
  }
  return naiveRound(price, 2);
}

export async function runAppleScriptSilently(appleScript: string) {
  await closeMainWindow();
  await runAppleScript(appleScript);
}
