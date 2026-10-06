import { Clipboard, getSelectedText, getPreferenceValues, environment } from "@raycast/api";
import { mkdir, writeFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { readInput, readClipboardInput } from "./input";
import { clearStaleHandoffs, runWithHandoff } from "./handoff";

export async function initialInput(argument?: string): Promise<string> {
  if (argument) return (await readInput(argument)).text;
  const preferences = getPreferenceValues<Preferences>();
  if (preferences.preferSelection ?? true) {
    const selected = await getSelectedText().catch(() => "");
    if (selected.trim()) return selected;
  }
  const clipboard = await Clipboard.read();
  return readClipboardInput(clipboard.file, clipboard.text);
}

export async function launchEditor(text: string): Promise<void> {
  const executable = join(environment.assetsPath, "JSON Workbench.app", "Contents", "MacOS", "JSONEditor");
  const html = join(environment.assetsPath, "JSON Workbench.app", "Contents", "Resources", "editor", "index.html");
  await access(executable, constants.X_OK);
  await access(html, constants.R_OK);
  await mkdir(environment.supportPath, { recursive: true });
  await clearStaleHandoffs(environment.supportPath);
  const request = join(environment.supportPath, `input-${randomUUID()}.json`);
  const indent = Number(getPreferenceValues<Preferences>().indent ?? "2");
  await writeFile(request, JSON.stringify({ text, indent }), { mode: 0o600 });
  await runWithHandoff(executable, [html, request], request);
}
