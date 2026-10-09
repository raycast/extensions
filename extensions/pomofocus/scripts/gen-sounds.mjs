// Generates assets/sounds/toggle.wav and done.wav (16-bit mono 44.1 kHz).
// Run: node scripts/gen-sounds.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RATE = 44100;
const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "sounds");
mkdirSync(outDir, { recursive: true });

/** notes: [{ freq, ms }], each with a quick attack and exponential decay. */
function synth(notes, gain = 0.35) {
  const samples = [];
  for (const { freq, ms } of notes) {
    const n = Math.round((RATE * ms) / 1000);
    for (let i = 0; i < n; i++) {
      const t = i / RATE;
      const env = Math.min(1, i / (RATE * 0.005)) * Math.exp(-6 * (i / n));
      samples.push(Math.sin(2 * Math.PI * freq * t) * env * gain);
    }
  }
  return samples;
}

function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767), i * 2));
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

writeFileSync(join(outDir, "toggle.wav"), wav(synth([{ freq: 880, ms: 120 }])));
writeFileSync(
  join(outDir, "done.wav"),
  wav(
    synth([
      { freq: 523.25, ms: 180 },
      { freq: 659.25, ms: 180 },
      { freq: 783.99, ms: 360 },
    ]),
  ),
);
console.log(`Wrote toggle.wav and done.wav to ${outDir}`);
