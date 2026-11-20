import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { PassThrough } from "node:stream";
import { Analyzer, FRAME_SIZE, HOP_SIZE, SAMPLE_RATE, PCMFrames, frequencyToNote } from "../src/detector";
import { Capture } from "../src/audio";

const tone = (freq: number, offset = 0) =>
  Float32Array.from(
    { length: FRAME_SIZE },
    (_, i) =>
      offset +
      0.12 * Math.sin((2 * Math.PI * freq * i) / SAMPLE_RATE) +
      0.03 * Math.sin((4 * Math.PI * freq * i) / SAMPLE_RATE),
  );
const tick = () => new Promise((r) => setImmediate(r));

for (const [name, freq] of Object.entries({
  E2: 82.4069,
  A2: 110,
  D3: 146.8324,
  G3: 195.9977,
  B3: 246.9417,
  E4: 329.6276,
})) {
  test(`detects ${name} with guitar harmonics and DC offset`, () => {
    const result = new Analyzer().analyze(tone(freq, 0.1));
    assert.ok(result.pitch);
    assert.ok(Math.abs(1200 * Math.log2(result.pitch / freq)) < 2);
    assert.equal(frequencyToNote(result.pitch).name + frequencyToNote(result.pitch).octave, name);
  });
}
test("rejects silence, DC and sub-audio transients", () => {
  const analyzer = new Analyzer();
  assert.equal(analyzer.analyze(new Float32Array(FRAME_SIZE)).pitch, null);
  assert.equal(analyzer.analyze(new Float32Array(FRAME_SIZE).fill(0.2)).pitch, null);
  assert.equal(analyzer.analyze(tone(2)).pitch, null);
});
test("reports detuning direction and cents", () => {
  assert.equal(frequencyToNote(110 * 2 ** (15 / 1200)).cents, 15);
  assert.equal(frequencyToNote(110 * 2 ** (-20 / 1200)).cents, -20);
});
test("PCM decoding is identical across odd and arbitrary pipe chunks", () => {
  const b = Buffer.alloc(FRAME_SIZE * 8);
  for (let i = 0; i < b.length / 2; i++) b.writeInt16LE(Math.round(20000 * Math.sin(i / 30)), i * 2);
  const whole: Float32Array[] = [];
  const split: Float32Array[] = [];
  new PCMFrames().push(b, (f) => whole.push(f));
  const frames = new PCMFrames();
  for (let i = 0; i < b.length; i += 101) frames.push(b.subarray(i, i + 101), (f) => split.push(f));
  assert.deepEqual(split, whole);
  assert.equal(whole.length, Math.floor((b.length / 2 - FRAME_SIZE) / HOP_SIZE) + 1);
});

function fake() {
  const kills: string[] = [];
  return Object.assign(new EventEmitter(), {
    stdout: new PassThrough(),
    stderr: new PassThrough(),
    kills,
    kill(signal: string) {
      kills.push(signal);
      return true;
    },
  });
}
test("one persistent process, no trim or shell, stops without updates", async () => {
  const child = fake();
  let spawns = 0,
    updates = 0;
  const capture = new Capture({
    device: 'iRig HD 2 "$()"',
    soxPath: "/fake/sox",
    onReading: () => updates++,
    onError: assert.fail,
    spawnProcess: (_cmd, args) => {
      spawns++;
      assert.ok(args.includes('iRig HD 2 "$()"'));
      assert.ok(!args.includes("trim"));
      return child as unknown as ChildProcessWithoutNullStreams;
    },
  });
  await capture.start();
  child.stdout.emit("data", Buffer.alloc(FRAME_SIZE * 4));
  assert.ok(updates > 1);
  assert.equal(spawns, 1);
  const count = updates;
  const done = capture.stop();
  child.stdout.emit("data", Buffer.alloc(FRAME_SIZE * 4));
  assert.equal(updates, count);
  assert.deepEqual(child.kills, ["SIGTERM"]);
  child.emit("close", 0);
  await done;
});
test("rapid device switches wait for the original process to close", async () => {
  const first = fake(),
    last = fake();
  let spawns = 0;
  const options = {
    device: "iRig HD 2",
    soxPath: "/fake/sox",
    onReading: () => {},
    onError: assert.fail,
    spawnProcess: () => {
      spawns++;
      return (spawns === 1 ? first : last) as unknown as ChildProcessWithoutNullStreams;
    },
  };
  const a = new Capture(options);
  await a.start();
  const b = new Capture(options);
  const bs = b.start();
  void b.stop();
  const c = new Capture(options);
  const cs = c.start();
  await tick();
  assert.equal(spawns, 1);
  first.emit("close", 0);
  await Promise.all([bs, cs]);
  assert.equal(spawns, 2);
  const end = c.stop();
  last.emit("close", 0);
  await end;
});
test("capture failure is exposed instead of pretending there is no note", async () => {
  const child = fake();
  const errors: string[] = [];
  const c = new Capture({
    device: "missing",
    soxPath: "/fake/sox",
    onReading: () => {},
    onError: (s) => errors.push(s),
    spawnProcess: () => child as unknown as ChildProcessWithoutNullStreams,
  });
  await c.start();
  child.stderr.emit("data", Buffer.from("sox FAIL coreaudio: no such device"));
  child.emit("close", 1);
  assert.match(errors[0], /no such device/);
  await c.stop();
});
