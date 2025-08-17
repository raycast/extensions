import { encode } from "@nem035/gpt-3-encoder";
import { closeMainWindow, getPreferenceValues } from "@raycast/api";
import { runAppleScript } from "run-applescript";

/**
 * Escapes special characters in a string for use in AppleScript
 */
function escapeStringForAppleScript(str: string): string {
  return str.replace(/[\\"]/g, "\\$&");
}

/**
 * Sends content to SideNotes application
 */
export async function sendToSideNote(content: string): Promise<void> {
  const applescript = `
  tell application "SideNotes"
    set f to first folder
    make new note in f with properties { text: "${escapeStringForAppleScript(content.trim())}" }
  end tell
  `;
  await runAppleScriptSilently(applescript);
}

/**
 * Rounds a number to specified decimal places
 */
function naiveRound(num: number, decimalPlaces = 0): number {
  const multiplier = Math.pow(10, decimalPlaces);
  return Math.round(num * multiplier) / multiplier;
}

/**
 * Counts tokens in a string using GPT-3 encoder
 */
export function countToken(content: string): number {
  return encode(content).length;
}

const { priceinput, priceoutput } = getPreferenceValues();

/**
 * Price configuration for different models ($ per million tokens)
 */
const prices: Record<string, { in: number; out: number }> = {
  "gpt-3.5-turbo": { in: 0.5, out: 1.5 },
  "gpt-4-turbo": { in: 10, out: 30 },
  "gpt-4": { in: 30, out: 60 },
  "gpt-4o-mini": { in: 0.15, out: 0.6 },
  "gpt-4o": { in: 5, out: 15 },
  "deepseek-reasoner": { in: 0.55, out: 2.19 },
  "deepseek-chat": { in: 0.27, out: 1.1 },
};

/**
 * Type guard for valid positive numbers
 */
function isValidNumber(value: unknown): value is number {
  return typeof value === "number" && !Number.isNaN(value) && value > 0;
}

/**
 * Calculates cost based on input/output tokens and their respective prices
 */
function calculateCost(tokenInput: number, tokenOutput: number, priceInput: number, priceOutput: number): number {
  const cost = (tokenInput * priceInput + tokenOutput * priceOutput) / 10000;
  return naiveRound(cost, 3);
}

/**
 * Estimates price for a model based on token usage
 */
export function estimatePrice(promptTokens: number, outputTokens: number, model: string): number {
  if (isValidNumber(+priceinput) && isValidNumber(+priceoutput)) {
    return calculateCost(promptTokens, outputTokens, priceinput, priceoutput);
  }

  if (model in prices) {
    return calculateCost(promptTokens, outputTokens, prices[model].in, prices[model].out);
  }

  return -1;
}

/**
 * Runs AppleScript silently by closing the main window first
 */
export async function runAppleScriptSilently(appleScript: string): Promise<void> {
  await closeMainWindow();
  try {
    await runAppleScript(appleScript);
  } catch (error) {
    console.error("Failed to run AppleScript:", error);
  }
}
