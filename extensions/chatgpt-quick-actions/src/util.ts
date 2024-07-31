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
  // price is per 1M tokens in dollars, but we are measuring in cents. Hence the denominator is 10,000
  // from : https://openai.com/api/pricing/
  let price = 0;
  if (model == "gpt-3.5-turbo") {
    price = (prompt_token * 0.5 + output_token * 1.5) / 10000;
  } else if (model == "gpt-4-turbo") {
    price = (prompt_token * 10.0 + output_token * 30.0) / 10000;
  } else if (model == "gpt-4") {
    price = (prompt_token * 30.0 + output_token * 60.0) / 10000;
  } else if (model == "gpt-4o-mini") {
    price = (prompt_token * 0.15 + output_token * 0.6) / 10000;
  } else if (model == "gpt-4o") {
    price = (prompt_token * 5.0 + output_token * 15.0) / 10000;
  } else {
    return -1;
  }
  return naiveRound(price, 3);
}

export async function runAppleScriptSilently(appleScript: string) {
  await closeMainWindow();
  await runAppleScript(appleScript);
}
