import { Clipboard, getPreferenceValues, showHUD } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const execFileAsync = promisify(execFile);

interface Prefs {
  keshaBinPath?: string;
  defaultVoice?: string;
}

// Raycast caps the no-view body to ~2 min; keep synthesis bounded so we
// don't leak a background `kesha say` process on very long clipboards.
const MAX_CHARS = 4000;

export default async function Command() {
  const prefs = getPreferenceValues<Prefs>();
  const keshaBin = prefs.keshaBinPath?.trim() || "kesha";
  const voice = prefs.defaultVoice?.trim() || "";

  const text = (await Clipboard.readText())?.trim() ?? "";
  if (!text) {
    await showHUD("✗ Clipboard is empty");
    return;
  }
  if (text.length > MAX_CHARS) {
    await showHUD(`✗ Clipboard too long (${text.length} > ${MAX_CHARS} chars)`);
    return;
  }

  const dir = mkdtempSync(join(tmpdir(), "raycast-kesha-"));
  const wavPath = join(dir, "speak.wav");

  try {
    await showHUD("🎙  Synthesizing…");
    // `--` terminates option parsing: any leading `--` in the clipboard
    // payload (e.g. a pasted code diff) won't be misread as a flag.
    const args = ["say", "--out", wavPath];
    if (voice) {
      args.push("--voice", voice);
    }
    args.push("--", text);
    await execFileAsync(keshaBin, args, { maxBuffer: 4 * 1024 * 1024 });

    await showHUD("🔊 Playing…");
    await execFileAsync("/usr/bin/afplay", [wavPath]);
    await showHUD("✓ Played clipboard");
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException | undefined)?.code;
    if (code === "ENOENT") {
      await showHUD(
        `✗ \`${keshaBin}\` not found — see https://github.com/drakulavich/kesha-voice-kit#install`,
      );
    } else {
      // Node's subprocess errors include the full argv (clipboard payload)
      // in both `.message` and `.cmd`. Log only non-sensitive exit metadata
      // so secrets pasted into the clipboard don't hit extension logs or
      // macOS notification history.
      const e = err as
        | (NodeJS.ErrnoException & { signal?: string })
        | undefined;
      console.error(
        `speak-clipboard failed: exitCode=${e?.code ?? "?"} signal=${e?.signal ?? "?"}`,
      );
      await showHUD("✗ Speech synthesis failed (see extension logs)");
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
