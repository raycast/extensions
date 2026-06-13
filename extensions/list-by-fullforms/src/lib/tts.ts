// Text-to-speech primitives for List by FullForms commands. Pipes
// through macOS's built-in `say` binary via child_process.execFile
// — `say` is universally present on macOS, voice + system rate are
// configurable in System Settings → Accessibility → Spoken Content,
// and no extra dependency is needed to ship TTS in a Raycast
// extension. (Raycast is macOS-only so cross-platform isn't a
// constraint we have to satisfy.)
//
// What this module owns: the `say` subprocess lifecycle (spawn,
// kill-previous-on-overlap, kill-on-shutdown), the rate + pause
// presets, and the `composeSpeakable` helper that joins multiple
// text fragments into a single Apple-TTS-flavoured payload.
//
// What callers own: deciding what to speak. The Search Entries
// command, for example, composes `term + definition + description`
// for ⌘T and passes just the definition for ⌘⇧T. composeSpeakable
// is variadic so any command can mix-and-match.
//
// Shutdown handling is layered three deep because Raycast doesn't
// expose an official "view dismissed" lifecycle and Esc / Cmd+W /
// command-switch don't reliably traverse React's unmount path —
// Raycast often hides the UI while keeping the extension process
// warm for the next launch. Callers should ALSO call stopSpeaking()
// from a useEffect cleanup as a third layer; the module-level
// process.on() handlers below catch the "process actually exits"
// path that the React cleanup can't see.

import { Toast, showToast } from "@raycast/api";
import { execFile, type ChildProcess } from "child_process";

// Words-per-minute rate passed to `say -r`. Most default English
// voices ship at ~175-200 wpm; 160 is "comfortably slower" —
// glossary entries pack a lot of detail per sentence and the
// default rate runs past you. Tune up/down here if it ends up
// feeling wrong for a new TTS surface.
const SAY_RATE_WPM = "160";

// Inter-segment silence in milliseconds. Inserted via Apple's TTS
// directive `[[slnc N]]` between segments inside composeSpeakable.
// Adds to (rather than replaces) the period's natural sentence-end
// intonation pause — combined effect is a clear "this section is
// over, here comes the next" break rather than running consecutive
// fields together.
const SEGMENT_PAUSE_MS = 400;

// Module-level ref to the currently-playing `say` subprocess.
// speakText kills any in-flight playback before starting a new one
// so triggering two speak actions back-to-back doesn't leave two
// overlapping audio streams. Module scope is intentional: it's the
// simplest way to share the ref across action handlers without
// threading state through React, and Raycast resets module state
// per command launch so there's no zombie reference between
// invocations.
let currentSay: ChildProcess | null = null;

// Speak `text` via macOS's built-in `say` binary at SAY_RATE_WPM
// using the user's system default voice (configurable in System
// Settings → Accessibility → Spoken Content; the -r flag overrides
// the system default rate, voice selection still defers to the
// user). execFile (not exec) passes the text as a single argv slot
// so shell metacharacters that might appear inside the payload
// can't be interpreted as command separators or redirections. The
// previous playback (if any) is killed first; the resulting
// "killed by us" error is filtered out of the toast path since it
// isn't a real failure from the user's POV.
export function speakText(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return;
  if (currentSay && currentSay.exitCode === null) {
    currentSay.kill();
  }
  currentSay = execFile("say", ["-r", SAY_RATE_WPM, trimmed], (err) => {
    if (err && !(err as NodeJS.ErrnoException & { killed?: boolean }).killed) {
      showToast({
        style: Toast.Style.Failure,
        title: "Could not speak",
        message: err.message,
      });
    }
  });
}

// Stop any in-flight TTS playback. No-op when nothing's running,
// so the user can hammer the stop shortcut without surprise.
// Doesn't toast on either branch — silent success is the expected
// outcome and silent no-op when there's nothing to stop avoids
// "Stopped speaking" noise after every shortcut press. SIGKILL
// (not the default SIGTERM) because `say` is sometimes slow to
// honour SIGTERM mid-utterance — by the time it does, the user
// already perceived a delay; SIGKILL drops it instantly, which is
// what "stop" should feel like.
export function stopSpeaking() {
  if (currentSay && currentSay.exitCode === null) {
    currentSay.kill("SIGKILL");
    currentSay = null;
  }
}

// Compose a `say`-friendly payload from one or more text segments.
// Periods give `say` natural sentence-boundary intonation; the
// `[[slnc N]]` directive (Apple's TTS silence directive, additive
// on top of the period pause) adds an explicit silence so multi-
// segment payloads read as distinct chunks instead of one run-on
// sentence. Empty / nullish segments are dropped so a payload with
// a missing field doesn't trail off into a double-period followed
// by a dangling silence. Trims defensively in case the server ever
// returns whitespace-padded values.
//
// Example: composeSpeakable(entry.term, entry.definition,
// entry.description) yields "{term}. [[slnc 400]] {definition}.
// [[slnc 400]] {description}".
export function composeSpeakable(
  ...segments: (string | null | undefined)[]
): string {
  return segments
    .map((s) => (s ?? "").trim())
    .filter((s) => s.length > 0)
    .join(`. [[slnc ${SEGMENT_PAUSE_MS}]] `);
}

// Register process-level shutdown handlers at module load so the
// `say` child is killed when Raycast terminates the extension —
// Esc / Cmd+W / command-switch don't reliably traverse React's
// unmount lifecycle, so a useEffect cleanup inside the consuming
// component can't be the only line of defence. Each path is
// idempotent (stopSpeaking is a no-op when nothing's playing) so
// doubling up across multiple signals is safe. We re-exit after
// the signal handlers because installing a listener on
// SIGTERM/SIGINT/SIGHUP overrides Node's default-kill behaviour
// for that signal — without process.exit() afterwards the
// extension would refuse to terminate, which would be much worse
// than the original leaked-say bug.
process.on("exit", stopSpeaking);
for (const signal of ["SIGTERM", "SIGINT", "SIGHUP"] as const) {
  process.on(signal, () => {
    stopSpeaking();
    process.exit(0);
  });
}
