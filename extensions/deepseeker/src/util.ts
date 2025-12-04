import { encode } from "@nem035/gpt-3-encoder";
import { closeMainWindow, getPreferenceValues } from "@raycast/api";
import { runAppleScript } from "run-applescript";

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

const { priceinput, priceoutput } = getPreferenceValues();

const prices: Record<string, { in: number; out: number }> = {
  "gpt-3.5-turbo": { in: 0.5, out: 1.5 },
  "gpt-4-turbo": { in: 10, out: 30 },
  "gpt-4": { in: 30, out: 60 },
  "gpt-4o-mini": { in: 0.15, out: 0.6 },
  "gpt-4o": { in: 5, out: 15 },
  "deepseek-reasoner": { in: 0.55, out: 2.19 },
  "deepseek-chat": { in: 0.27, out: 1.1 },
};

function isValidNumber(value: unknown): value is number {
  return typeof value === "number" && !Number.isNaN(value) && value > 0;
}

function calculate_cost(token_in: number, token_out: number, price_in: number, price_out: number): number {
  const cost = (token_in * price_in + token_out * price_out) / 10000;
  return naiveRound(cost, 3);
}

export function estimatePrice(promptTokens: number, outputTokens: number, model: string): number {
  if (isValidNumber(+priceinput) && isValidNumber(+priceoutput)) {
    return calculate_cost(promptTokens, outputTokens, priceinput, priceoutput);
  }

  if (model in prices) {
    return calculate_cost(promptTokens, outputTokens, prices[model].in, prices[model].out);
  }

  return -1;
}

export async function runAppleScriptSilently(appleScript: string) {
  await closeMainWindow();
  await runAppleScript(appleScript);
}
