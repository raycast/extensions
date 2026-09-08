import { environment } from "@raycast/api";
import { ChildProcess, spawn } from "node:child_process";
import { join } from "node:path";

const MAX_POLYPHONY = 8;
const NORMAL_NOTE_SECONDS = 1.8;
const SUSTAINED_NOTE_SECONDS = 4.5;
const WATCHDOG_GRACE_MS = 1_000;

type ActiveNote = {
  midi: number;
  player: ChildProcess;
  watchdog: ReturnType<typeof setTimeout>;
};

const activeNotes: ActiveNote[] = [];

function stopNote(note: ActiveNote): void {
  clearTimeout(note.watchdog);
  if (note.player.exitCode === null && note.player.signalCode === null) {
    note.player.kill("SIGTERM");
  }
  const index = activeNotes.indexOf(note);
  if (index >= 0) activeNotes.splice(index, 1);
}

export function playNote(midi: number, sustained: boolean, volume: number): void {
  // Re-triggering a key replaces its previous voice instead of accumulating
  // multiple players for the same sample.
  const previousVoice = activeNotes.find((note) => note.midi === midi);
  if (previousVoice) stopNote(previousVoice);

  while (activeNotes.length >= MAX_POLYPHONY) {
    const oldestVoice = activeNotes[0];
    if (oldestVoice) stopNote(oldestVoice);
  }

  const duration = sustained ? SUSTAINED_NOTE_SECONDS : NORMAL_NOTE_SECONDS;
  const samplePath = join(environment.assetsPath, "samples", `${midi}.mp3`);
  const player = spawn("/usr/bin/afplay", ["-v", String(volume), "-t", String(duration), samplePath], {
    stdio: "ignore",
  });
  const note = {
    midi,
    player,
    watchdog: setTimeout(() => stopNote(note), duration * 1_000 + WATCHDOG_GRACE_MS),
  };

  activeNotes.push(note);
  player.once("error", () => stopNote(note));
  player.once("exit", () => stopNote(note));
}

export function stopAllNotes(): void {
  for (const note of [...activeNotes]) stopNote(note);
}
