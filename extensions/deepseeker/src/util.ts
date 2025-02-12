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

export function estimatePrice(promptTokens: number, outputTokens: number, model: string): number {
  const modelPrices = prices[model];
  if (!modelPrices) return -1;

  const inRate = (model.startsWith("deepseek") && priceinput) ?? modelPrices.in;
  const outRate = (model.startsWith("deepseek") && priceoutput) ?? modelPrices.out;

  const price = (promptTokens * +inRate + outputTokens * +outRate) / 10000;
  return Number(price.toFixed(3));
}

export async function runAppleScriptSilently(appleScript: string) {
  await closeMainWindow();
  await runAppleScript(appleScript);
}
