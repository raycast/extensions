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

// Prices are per 1M tokens in dollars, converted to cents
export function estimatePrice(input_token: number, output_token: number, model: string) {
  let price = 0;

  if (model == "gpt-4o") {
    price = (input_token * 2.5 + output_token * 10) / 10000;
  } else if (model == "gpt-4o-mini") {
    price = (input_token * 0.15 + output_token * 0.6) / 10000;
  } else if (model == "gpt-4.1") {
    price = (input_token * 2 + output_token * 8) / 10000;
  } else if (model == "gpt-4.1-mini") {
    price = (input_token * 0.4 + output_token * 1.6) / 10000;
  } else if (model == "gpt-4.1-nano") {
    price = (input_token * 0.1 + output_token * 0.4) / 10000;
  } else if (model == "o1") {
    price = (input_token * 15 + output_token * 60) / 10000;
  } else if (model == "o1-mini") {
    price = (input_token * 1.1 + output_token * 4.4) / 10000;
  } else if (model == "o1-pro") {
    price = (input_token * 150 + output_token * 600) / 10000;
  } else if (model == "o3") {
    price = (input_token * 2 + output_token * 8) / 10000;
  } else if (model == "o3-mini") {
    price = (input_token * 1.1 + output_token * 4.4) / 10000;
  } else if (model == "o4-mini") {
    price = (input_token * 1.1 + output_token * 4.4) / 10000;
  } else {
    return -1;
  }
  return naiveRound(price, 5);
}

export async function runAppleScriptSilently(appleScript: string) {
  await closeMainWindow();
  await runAppleScript(appleScript);
}
