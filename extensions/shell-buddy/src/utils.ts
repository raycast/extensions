import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import fetch from "node-fetch";
import { baseUrl } from "./config";
import type { CommandPreferences, ConversionResult, CheckCreditsResult, KnownPrompts } from "./types";

/**
 * Checks the remaining credits for the saved license via API call
 */
export async function checkRemainingCredits(): Promise<CheckCreditsResult> {
  try {
    const { license } = getPreferenceValues<CommandPreferences>();
    const res = await fetch(`${baseUrl}/api/credits?l=${encodeURIComponent(license.trim())}`);
    const result = await res.json();
    return result as CheckCreditsResult;
  } catch (e) {
    return { success: false, title: "Server error", remainingCredits: 0 };
  }
}

/**
 * Converts a natural language prompt to a shell command via API call
 * @param prompt
 */
export async function convertPromptToCommand(prompt: string): Promise<ConversionResult> {
  const { license } = getPreferenceValues<CommandPreferences>();
  try {
    const res = await fetch(
      `${baseUrl}/api/convert?p=${encodeURIComponent(prompt)}&l=${encodeURIComponent(license.trim())}`
    );
    const result = await res.json();
    return result as ConversionResult;
  } catch (e) {
    return { success: false, title: "Server error" };
  }
}

/**
 * Retrieves all known prompts from local storage
 */
export async function getKnownPrompts(): Promise<KnownPrompts> {
  const knownPrompts = await LocalStorage.getItem<string>("known-prompts");

  if (!knownPrompts) {
    return {};
  }

  return JSON.parse(knownPrompts);
}

/**
 * Adds a prompt/command to the known commands in local storage
 * @param prompt
 * @param command
 */
export async function addKnownPrompt(prompt: string, command: string) {
  const knownPrompts = await getKnownPrompts();
  await LocalStorage.setItem("known-prompts", JSON.stringify({ ...knownPrompts, [prompt]: command }));
}

/**
 * Runs the selected command in a new terminal window
 * @param command
 */
export async function runInTerminal(command: string) {
  const script = `
  tell application "Terminal"
    do script "${command.replaceAll('"', '\\"')}"
    activate
  end tell
  `;

  runAppleScript(script);
}
