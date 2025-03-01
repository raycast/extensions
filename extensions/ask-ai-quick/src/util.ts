import { useEffect, useState } from "react";
import { encode } from "@nem035/gpt-3-encoder";
import { closeMainWindow, getPreferenceValues } from "@raycast/api";
import { runAppleScript } from "run-applescript";

function naiveRound(num: number, decimalPlaces = 0) {
  const p = Math.pow(10, decimalPlaces);
  return Math.round(num * p) / p;
}

export function escapeStringForAppleScript(str: string) {
  return str.replace(/[\\"]/g, "\\$&");
}

// export async function sentToSideNote(content: string) {
//   const applescript = `
//   tell application "SideNotes"
//     set f to first folder
//     make new note in f with properties { text: "${escapeStringForAppleScript(content.trim())}" }
//   end tell
//   `;
//   await runAppleScriptSilently(applescript);
// }

export function countToken(content: string) {
  return encode(content).length;
}

// get priceoutput, priceinput from preference
const input_price = +getPreferenceValues().priceinput || 0.27;
const output_price = +getPreferenceValues().priceoutput || 1.1;

export function estimatePrice(prompt_token: number, output_token: number) {
  return (prompt_token * input_price) / 1000 + (output_token * output_price) / 1000;
}

export const useEstimatedPrice = (prompt_token: number, output_token: number) => {
  const [price, setPrice] = useState("0 cents");

  useEffect(() => {
    const calculatedPrice = estimatePrice(prompt_token, output_token);
    setPrice(`${naiveRound(calculatedPrice * 100, 3)} cents`);
  }, [prompt_token, output_token]);

  return price;
};

export async function runAppleScriptSilently(appleScript: string) {
  await closeMainWindow();
  await runAppleScript(appleScript);
}
