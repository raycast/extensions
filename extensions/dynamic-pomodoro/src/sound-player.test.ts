import assert from "node:assert/strict";
import test from "node:test";
import { playCompletionSound, stopCompletionSound } from "./sound-player.ts";

const USER_INITIATED = "user-initiated";
const BACKGROUND = "background";

test("playCompletionSound uses custom source when custom file succeeds", async () => {
  const result = await playCompletionSound(
    {
      mode: "always",
      launchType: USER_INITIATED,
      customPath: "/tmp/done.wav",
    },
    {
      now: () => 100,
      playCustomSound: async (_path, _maxDurationSeconds, _onStart) => {},
      playBeep: async () => {
        throw new Error("should not run");
      },
      setCompletionSoundPid: async () => {},
      clearCompletionSoundPid: async () => {},
    },
  );

  assert.equal(result.attempted, true);
  assert.equal(result.attemptedAt, 100);
  assert.equal(result.mode, "always");
  assert.equal(result.source, "custom");
  assert.equal(result.played, true);
  assert.equal(result.error, undefined);
});

test("playCompletionSound falls back to beep when custom sound fails", async () => {
  const result = await playCompletionSound(
    {
      mode: "always",
      launchType: USER_INITIATED,
      customPath: "/bad/path.wav",
    },
    {
      now: () => 200,
      playCustomSound: async (_path, _maxDurationSeconds, _onStart) => {
        throw new Error("ENOENT");
      },
      playBeep: async () => {},
      setCompletionSoundPid: async () => {},
      clearCompletionSoundPid: async () => {},
    },
  );

  assert.equal(result.attempted, true);
  assert.equal(result.attemptedAt, 200);
  assert.equal(result.source, "beep");
  assert.equal(result.played, true);
  assert.equal(result.error, "Error: ENOENT");
});

test("playCompletionSound returns none when mode is off", async () => {
  const result = await playCompletionSound(
    {
      mode: "off",
      launchType: BACKGROUND,
      customPath: "/tmp/done.wav",
    },
    {
      now: () => 300,
      playCustomSound: async (_path, _maxDurationSeconds, _onStart) => {
        throw new Error("should not run");
      },
      playBeep: async () => {
        throw new Error("should not run");
      },
      setCompletionSoundPid: async () => {},
      clearCompletionSoundPid: async () => {},
    },
  );

  assert.equal(result.attempted, false);
  assert.equal(result.attemptedAt, undefined);
  assert.equal(result.source, "none");
  assert.equal(result.played, false);
  assert.equal(result.error, undefined);
});

test("playCompletionSound forwards maxDurationSeconds to custom playback", async () => {
  const calls: Array<{ path: string; maxDurationSeconds: number | undefined }> = [];

  const result = await playCompletionSound(
    {
      mode: "always",
      launchType: USER_INITIATED,
      customPath: "/tmp/done.wav",
      maxDurationSeconds: 5,
    },
    {
      now: () => 400,
      playCustomSound: async (path, maxDurationSeconds, _onStart) => {
        calls.push({ path, maxDurationSeconds });
      },
      playBeep: async () => {
        throw new Error("should not run");
      },
      setCompletionSoundPid: async () => {},
      clearCompletionSoundPid: async () => {},
    },
  );

  assert.equal(result.attempted, true);
  assert.equal(result.attemptedAt, 400);
  assert.equal(result.source, "custom");
  assert.equal(result.played, true);
  assert.deepEqual(calls, [{ path: "/tmp/done.wav", maxDurationSeconds: 5 }]);
});

test("playCompletionSound marks played=false when custom and beep fallback both fail", async () => {
  const result = await playCompletionSound(
    {
      mode: "always",
      launchType: USER_INITIATED,
      customPath: "/bad/path.wav",
    },
    {
      now: () => 500,
      playCustomSound: async (_path, _maxDurationSeconds, _onStart) => {
        throw new Error("custom failed");
      },
      playBeep: async () => {
        throw new Error("beep failed");
      },
      setCompletionSoundPid: async () => {},
      clearCompletionSoundPid: async () => {},
    },
  );

  assert.equal(result.attempted, true);
  assert.equal(result.attemptedAt, 500);
  assert.equal(result.source, "beep");
  assert.equal(result.played, false);
  assert.equal(result.error, "Error: custom failed; fallback failed: Error: beep failed");
});

test("playCompletionSound stores completion sound pid when custom sound starts", async () => {
  const stored: number[] = [];

  const result = await playCompletionSound(
    {
      mode: "always",
      launchType: USER_INITIATED,
      customPath: "/tmp/done.wav",
    },
    {
      now: () => 600,
      playCustomSound: async (_path, _maxDurationSeconds, onStart) => {
        onStart?.(4242);
      },
      playBeep: async () => {
        throw new Error("should not run");
      },
      setCompletionSoundPid: async (pid) => {
        stored.push(pid);
      },
      clearCompletionSoundPid: async () => {},
    },
  );

  assert.equal(result.played, true);
  assert.deepEqual(stored, [4242]);
});

test("playCompletionSound clears stored pid after custom sound completes", async () => {
  let cleared = 0;

  await playCompletionSound(
    {
      mode: "always",
      launchType: USER_INITIATED,
      customPath: "/tmp/done.wav",
    },
    {
      now: () => 700,
      playCustomSound: async (_path, _maxDurationSeconds, onStart) => {
        onStart?.(5150);
      },
      playBeep: async () => {
        throw new Error("should not run");
      },
      setCompletionSoundPid: async () => {},
      clearCompletionSoundPid: async () => {
        cleared += 1;
      },
    },
  );

  assert.equal(cleared, 1);
});

test("stopCompletionSound kills stored pid and clears it", async () => {
  const kills: number[] = [];
  let cleared = 0;

  await stopCompletionSound({
    getCompletionSoundPid: async () => 123,
    clearCompletionSoundPid: async () => {
      cleared += 1;
    },
    killProcess: (pid) => {
      kills.push(pid);
    },
  });

  assert.deepEqual(kills, [123]);
  assert.equal(cleared, 1);
});

test("stopCompletionSound is a no-op when pid is missing", async () => {
  await stopCompletionSound({
    getCompletionSoundPid: async () => null,
    clearCompletionSoundPid: async () => {
      throw new Error("should not clear");
    },
    killProcess: () => {
      throw new Error("should not kill");
    },
  });
});
