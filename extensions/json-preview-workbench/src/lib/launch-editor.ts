import { Clipboard, getSelectedText, getPreferenceValues, environment } from "@raycast/api";
import { mkdir, writeFile, unlink, access } from "node:fs/promises";
import { constants } from "node:fs";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { readInput } from "./input";

export async function initialInput(argument?: string): Promise<string> {
  if (argument) return (await readInput(argument)).text;
  const preferences = getPreferenceValues<{ preferSelection: boolean }>();
  if (preferences.preferSelection) {
    const selected = await getSelectedText().catch(() => "");
    if (selected.trim()) return selected;
  }
  const clipboard = await Clipboard.read();
  if (clipboard.file) return (await readInput(clipboard.file)).text;
  return clipboard.text ?? "";
}

export async function launchEditor(text: string): Promise<void> {
  const executable = join(environment.assetsPath, "JSON Workbench.app", "Contents", "MacOS", "JSONEditor");
  const html = join(environment.assetsPath, "JSON Workbench.app", "Contents", "Resources", "editor", "index.html");
  await access(executable, constants.X_OK);
  await mkdir(environment.supportPath, { recursive: true });
  const request = join(environment.supportPath, `input-${randomUUID()}.json`);
  const indent = Number(getPreferenceValues<{ indent?: string }>().indent ?? "2");
  await writeFile(request, JSON.stringify({ text, indent }), { mode: 0o600 });
  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(executable, [html, request], { detached: true, stdio: "ignore" });
      child.once("error", reject);
      child.once("spawn", () => {
        child.unref();
        resolve();
      });
    });
  } catch (error) {
    await unlink(request).catch(() => undefined);
    throw error;
  }
}
