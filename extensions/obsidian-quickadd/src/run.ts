import { showHUD, showToast, Toast } from "@raycast/api";
import { openUri } from "./open";
import { Choice } from "./types";
import { buildQuickAddUri, collectVars, runsInBackground } from "./uri";

/** Basic mode: run a choice through the obsidian://quickadd URI. */
export async function runChoice(vaultName: string, choice: Choice, values: string[]): Promise<void> {
  const uri = buildQuickAddUri(vaultName, choice.name, collectVars(choice.fields, values));
  const background = runsInBackground(choice);
  try {
    await openUri(uri, background);
  } catch (error) {
    const stderr = (error as { stderr?: string }).stderr;
    await showToast({ style: Toast.Style.Failure, title: "Could not open Obsidian", message: stderr || String(error) });
    return;
  }
  await showHUD(background ? `Sent to QuickAdd: ${choice.name}` : `Opening in Obsidian: ${choice.name}`);
}
