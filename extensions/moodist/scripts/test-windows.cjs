const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const { spawnSync, execFile } = require("node:child_process");
const { buildSync } = require("esbuild");

if (process.platform !== "win32") {
  console.log("Windows playback tests require Windows.");
  process.exit(0);
}

const root = path.resolve(__dirname, "..");
const executable = path.join(root, "rust", "target", "debug", "moodist-windows.exe");
assert.ok(fs.existsSync(executable), "Run cargo build --manifest-path rust/Cargo.toml first");
const background = process.argv[2] === "--background";
const supportPath = background ? process.argv[3] : fs.mkdtempSync(path.join(os.tmpdir(), "Moodist ' 测试 "));
const stateFile = path.join(supportPath, "windows-mix.json");
const bundled = buildSync({
  entryPoints: [path.join(root, "src/player.ts")],
  bundle: true,
  platform: "node",
  format: "cjs",
  external: ["@raycast/api", "rust:../rust"],
  write: false,
});

function rpc(support, action) {
  const child = spawnSync(executable, ["mixer_request"], {
    input: JSON.stringify([support, action]),
    encoding: "utf8",
    windowsHide: true,
    timeout: 30000,
  });
  assert.ifError(child.error);
  if (child.status !== 0) throw new Error(child.stderr || `Native mixer exited with ${child.status}`);
  return JSON.parse(child.stdout);
}

function concurrentRequest(action) {
  return new Promise((resolve, reject) => {
    const child = execFile(
      executable,
      ["mixer_request"],
      { windowsHide: true, timeout: 30000 },
      (error, stdout, stderr) => {
        if (error) reject(new Error(stderr || error.message));
        else resolve(JSON.parse(JSON.parse(stdout)));
      },
    );
    child.stdin.end(JSON.stringify([supportPath, JSON.stringify(action)]));
  });
}

function mediaSessionIds() {
  const script = `
$ProgressPreference = 'SilentlyContinue'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$managerType = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType=WindowsRuntime]
$operation = $managerType::RequestAsync()
$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -like 'IAsyncOperation*' } | Select-Object -First 1).MakeGenericMethod($managerType)
$manager = $asTask.Invoke($null, @($operation)).GetAwaiter().GetResult()
ConvertTo-Json -Compress -InputObject @($manager.GetSessions() | ForEach-Object { $_.SourceAppUserModelId })
`;
  const powershell = path.join(
    process.env.SystemRoot || "C:\\Windows",
    "System32",
    "WindowsPowerShell",
    "v1.0",
    "powershell.exe",
  );
  const result = spawnSync(
    powershell,
    ["-NoProfile", "-NonInteractive", "-EncodedCommand", Buffer.from(script, "utf16le").toString("base64")],
    { encoding: "utf8", windowsHide: true, timeout: 15000 },
  );
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout.replace(/^\uFEFF/, ""));
}

const mod = { exports: {} };
vm.runInNewContext(bundled.outputFiles[0].text, {
  module: mod,
  exports: mod.exports,
  require: (name) =>
    name === "@raycast/api"
      ? {
          environment: { supportPath, assetsPath: path.join(root, "assets") },
          getPreferenceValues: () => ({ defaultVolume: "50" }),
        }
      : name === "rust:../rust"
        ? { mixer_request: async (support, action) => rpc(support, action) }
        : require(name),
  process,
  Buffer,
  SharedArrayBuffer,
  Int32Array,
  Atomics,
  setTimeout,
});
const player = mod.exports;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};
const read = () => JSON.parse(fs.readFileSync(stateFile, "utf8"));
let worker;

function silentWav(file) {
  const data = Buffer.alloc(44 + 16000);
  data.write("RIFF");
  data.writeUInt32LE(data.length - 8, 4);
  data.write("WAVEfmt ", 8);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(1, 22);
  data.writeUInt32LE(16000, 24);
  data.writeUInt32LE(32000, 28);
  data.writeUInt16LE(2, 32);
  data.writeUInt16LE(16, 34);
  data.write("data", 36);
  data.writeUInt32LE(16000, 40);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
}

if (background) {
  player.play("binaural-delta").catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
} else
  (async () => {
    for (const id of ["delta", "theta"]) silentWav(path.join(supportPath, "sounds", "binaural", `binaural-${id}.wav`));
    await player.play("binaural-delta");
    worker = read().sounds["binaural-delta"].pid;
    await player.play("binaural-theta");
    await wait(2500);
    assert.equal(player.playingCount(await player.getMix()), 2, "both sounds loop beyond the short media duration");
    assert.ok(
      !mediaSessionIds().some((id) => id.toLowerCase().includes("moodist-windows")),
      "ambient playback does not publish an SMTC session",
    );
    assert.equal(read().sounds["binaural-theta"].pid, worker, "one native mixer owns all sounds");
    await Promise.all([
      concurrentRequest({ type: "volume", id: "binaural-delta", volume: 0.2 }),
      concurrentRequest({ type: "volume", id: "binaural-theta", volume: 0.8 }),
    ]);
    assert.equal(read().sounds["binaural-delta"].volume, 0.2, "concurrent requests retain both updates");
    assert.equal(read().sounds["binaural-theta"].volume, 0.8);
    await player.setVolume("binaural-delta", 0.25);
    await player.setMaster(0.5);
    assert.equal(read().sounds["binaural-delta"].pid, worker, "live volume changes retain the worker");
    assert.equal(read().sounds["binaural-delta"].volume, 0.25);
    assert.equal(read().master, 0.5);
    assert.equal(await player.pause(), 2);
    assert.equal(player.playingCount(await player.getMix()), 0);
    assert.equal(await player.resume(), 2);
    await player.loadMix([{ soundId: "binaural-theta", volume: 0.75 }], 0.25, "test-preset");
    assert.equal(read().preset, "test-preset");
    assert.equal(Object.keys(read().sounds).length, 1);
    await player.stopAll();

    const launcher = spawnSync(process.execPath, [__filename, "--background", supportPath], {
      windowsHide: true,
      encoding: "utf8",
      timeout: 15000,
    });
    assert.ifError(launcher.error);
    assert.equal(launcher.status, 0, launcher.stderr);
    await wait(2500);
    assert.ok(alive(worker), "native playback survives the launching command exiting");
    assert.equal(player.playingCount(await player.getMix()), 1);

    await player.setTimer(1);
    assert.ok(await player.cancelTimer());
    assert.equal(read().timer, undefined);
    await player.setTimer(1);
    const timer = read().timer;
    await assert.rejects(player.setTimer(0));
    await assert.rejects(player.setTimer(1441));
    const invalidFile = path.join(supportPath, "sounds", "binaural", "binaural-alpha.wav");
    fs.writeFileSync(invalidFile, "not audio");
    await assert.rejects(player.play("binaural-alpha"), "decode errors reach the caller");
    assert.equal(player.playingCount(await player.getMix()), 1, "a failed addition keeps the existing mix playing");
    process.kill(worker);
    await wait(500);
    const stale = read();
    stale.sounds["binaural-delta"].pid = process.pid;
    fs.writeFileSync(stateFile, JSON.stringify(stale));
    assert.equal(player.playingCount(await player.getMix()), 0, "restart clears stale playback identities");
    await player.resume();
    worker = read().sounds["binaural-delta"].pid;
    assert.ok(alive(worker));
    assert.equal(read().timer.endsAt, timer.endsAt, "sleep timer survives worker recovery");
    console.log(
      "Native looping, mixing, live volumes, presets, background lifetime, decode failures, cancellation, and recovery passed. Waiting for sleep timer…",
    );
    await wait(Math.max(0, timer.endsAt - Date.now()) + 1500);
    const expired = read(); // No getMix call: the background worker must expire the timer itself.
    assert.equal(expired.timer, undefined);
    assert.ok(Object.values(expired.sounds).every((entry) => !entry.pid));
    console.log("Windows native mixer and independent sleep timer checks passed.");
  })()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      try {
        await player.stopAll();
        await player.cancelTimer();
      } catch {}
      if (worker && alive(worker)) {
        try {
          process.kill(worker);
        } catch {}
      }
      if (process.exitCode) console.error("Test artifacts:", supportPath);
      else fs.rmSync(supportPath, { recursive: true, force: true });
    });
