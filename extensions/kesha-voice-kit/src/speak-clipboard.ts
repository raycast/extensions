import { Clipboard, getPreferenceValues, showHUD } from "@raycast/api";
import { execFile, spawn as spawnProcess } from "node:child_process";
import { promisify } from "node:util";
import { access, constants, mkdtemp, rm } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { notFoundMessage, resolveKeshaBin } from "./lib/kesha-bin";

const execFileAsync = promisify(execFile);

interface Prefs {
  keshaBinPath?: string;
  defaultVoice?: string;
}

// Raycast caps the no-view body to ~2 min; keep synthesis bounded so we
// don't leak a background `kesha say` process on very long clipboards.
const MAX_CHARS = 4000;

// kesha install --tts caches models under ~/.cache/kesha/models/. Checking
// whether the canonical entry-point file exists is a fast (~µs) capability
// probe — no need to spawn `kesha-engine --capabilities-json` on every
// Speak Clipboard invocation.
const KOKORO_MODEL = join(
  homedir(),
  ".cache/kesha/models/kokoro-82m/model.onnx",
);
const VOSK_RU_MODEL = join(homedir(), ".cache/kesha/models/vosk-ru/model.onnx");

// AVSpeech voice ids that ship with macOS as default-installed compact
// voices. These are the fallback when the higher-quality Kokoro/Vosk
// models aren't staged on the user's machine.
const MACOS_EN_FALLBACK = "macos-com.apple.voice.compact.en-US.Samantha";
const MACOS_RU_FALLBACK = "macos-com.apple.voice.compact.ru-RU.Milena";

async function isReadable(path: string): Promise<boolean> {
  try {
    await access(path, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/** Pick a voice based on detected language and which TTS models the user has
 *  staged. Higher-quality Kokoro / Vosk-TTS are preferred when available;
 *  AVSpeech (Samantha / Milena) is the fallback so the command works even
 *  before `kesha install --tts` runs.
 *
 *  Override order:
 *  1. `defaultVoice` preference (explicit user choice — always wins).
 *  2. Cyrillic detected → Vosk-TTS if model present, else AVSpeech Milena.
 *  3. Else → Kokoro if model present, else AVSpeech Samantha. */
async function pickVoice(text: string, prefs: Prefs): Promise<string> {
  const override = prefs.defaultVoice?.trim();
  if (override) return override;
  const hasCyrillic = /[Ѐ-ӿ]/.test(text);
  if (hasCyrillic) {
    return (await isReadable(VOSK_RU_MODEL))
      ? "ru-vosk-m02"
      : MACOS_RU_FALLBACK;
  }
  return (await isReadable(KOKORO_MODEL)) ? "en-am_michael" : MACOS_EN_FALLBACK;
}

export default async function Command() {
  const prefs = getPreferenceValues<Prefs>();

  const text = (await Clipboard.readText())?.trim() ?? "";
  if (!text) {
    await showHUD("✗ Clipboard is empty");
    return;
  }
  if (text.length > MAX_CHARS) {
    await showHUD(`✗ Clipboard too long (${text.length} > ${MAX_CHARS} chars)`);
    return;
  }

  const voice = await pickVoice(text, prefs);
  const spawn = await resolveKeshaBin(prefs.keshaBinPath);
  if (!spawn) {
    await showHUD("✗ kesha CLI not found — see extension logs");
    console.error(notFoundMessage());
    return;
  }

  // Paint the HUD first so Raycast's launcher feels responsive; the tmpdir
  // and synthesis work happens behind the already-visible feedback.
  await showHUD("🎙  Synthesizing…");
  const dir = await mkdtemp(join(tmpdir(), "raycast-kesha-"));
  // OGG/Opus output: ~10× smaller than WAV, side-steps the WAVE_FORMAT_
  // EXTENSIBLE channel-mask bug from #245 (mono played in left ear only),
  // and `afplay` on macOS 10.13+ decodes Opus natively. The format is
  // inferred from the `.ogg` extension; explicit `--format ogg-opus`
  // documents the intent for grep-ability across the kesha pipeline.
  const audioPath = join(dir, "speak.ogg");

  try {
    // `--` terminates option parsing: any leading `--` in the clipboard
    // payload (e.g. a pasted code diff) won't be misread as a flag.
    const args = [
      ...spawn.prefixArgs,
      "say",
      "--format",
      "ogg-opus",
      "--out",
      audioPath,
    ];
    if (voice) {
      args.push("--voice", voice);
    }
    args.push("--", text);
    await execFileAsync(spawn.command, args, { maxBuffer: 4 * 1024 * 1024 });

    // Detach afplay so this no-view command can return immediately —
    // Raycast tears down the JS runtime not long after default() resolves,
    // and an awaited `afplay` was getting cut off mid-playback (only the
    // first sentence of long clipboards was audible). With `detached:true`
    // + unref(), afplay keeps running after Speak Clipboard returns.
    //
    // Tempdir cleanup in `finally` runs immediately, BEFORE playback
    // completes. That's safe on POSIX: macOS keeps the unlinked file's
    // inode alive while afplay holds an open fd, so the audio plays to
    // completion even though the path no longer exists.
    //
    // Stop Speech (pkill afplay) remains the canonical cancel path.
    const afplay = spawnProcess("/usr/bin/afplay", [audioPath], {
      detached: true,
      stdio: "ignore",
    });
    afplay.unref();
    await showHUD("🔊 Playing — Stop Speech to cancel");
  } catch (err: unknown) {
    // Node's subprocess errors include the full argv (clipboard payload)
    // in both `.message` and `.cmd`. Log only non-sensitive exit metadata
    // so secrets pasted into the clipboard don't hit extension logs or
    // macOS notification history.
    const e = err as (NodeJS.ErrnoException & { signal?: string }) | undefined;
    console.error(
      `speak-clipboard failed: exitCode=${e?.code ?? "?"} signal=${e?.signal ?? "?"}`,
    );
    await showHUD("✗ Speech synthesis failed (see extension logs)");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
