import { Clipboard, getSelectedText, getPreferenceValues, environment } from "@raycast/api";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { readInput, readClipboardInput } from "./input";
import { clearStaleHandoffs, runWithHandoff } from "./handoff";
import { MAX_INPUT_BYTES } from "./json";

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
  if (Buffer.byteLength(text, "utf8") > MAX_INPUT_BYTES) throw new Error("The editor input exceeds 8 MiB.");
  await mkdir(environment.supportPath, { recursive: true });
  await clearStaleHandoffs(environment.supportPath);
  const request = join(environment.supportPath, `input-${randomUUID()}.json`);
  const indent = Number(getPreferenceValues<Preferences>().indent ?? "2");
  await runWithHandoff(async () => {
    await writeFile(request, JSON.stringify({ text, indent }), { mode: 0o600, flag: "wx" });
    const { startEditor } = await import("swift:../../swift/json-editor");
    await startEditor(request);
  }, request);
}
