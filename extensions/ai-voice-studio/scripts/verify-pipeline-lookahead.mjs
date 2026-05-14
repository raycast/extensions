import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();

await verifyMiniMaxReadingRunner();
await verifyMiniMaxLookaheadSpeedInvalidation();
await verifyMiniMaxLookaheadCancellationOnStop();

await verifyPipeline({
  label: "MiMo",
  modulePath: "src/utils/mimo-pipelined-reading.ts",
  apiPath: "src/api/mimo-tts.ts",
  statePath: "src/utils/mimo-playback-state.ts",
  options: { format: "wav", playbackRate: 1 },
});
await verifyPipelineStopsBeforeNextPlayback({
  label: "MiMo",
  modulePath: "src/utils/mimo-pipelined-reading.ts",
  apiPath: "src/api/mimo-tts.ts",
  statePath: "src/utils/mimo-playback-state.ts",
  options: { format: "wav", playbackRate: 1 },
});

await verifyPipeline({
  label: "OpenAI",
  modulePath: "src/utils/openai-pipelined-reading.ts",
  apiPath: "src/api/openai-tts.ts",
  statePath: "src/utils/openai-playback-state.ts",
  options: { format: "mp3", playbackRate: 1 },
});
await verifyPipelineStopsBeforeNextPlayback({
  label: "OpenAI",
  modulePath: "src/utils/openai-pipelined-reading.ts",
  apiPath: "src/api/openai-tts.ts",
  statePath: "src/utils/openai-playback-state.ts",
  options: { format: "mp3", playbackRate: 1 },
});

console.log(
  JSON.stringify(
    {
      checked: [
        "MiniMax reading runner starts next synthesis before current playback",
        "MiniMax reading runner cancels stale lookahead after speed changes",
        "MiniMax reading runner cancels pending lookahead after stop",
        "MiMo lookahead starts next synthesis before playback",
        "MiMo lookahead stops before playing the next chunk",
        "OpenAI lookahead starts next synthesis before playback",
        "OpenAI lookahead stops before playing the next chunk",
      ],
    },
    null,
    2,
  ),
);

async function verifyMiniMaxReadingRunner() {
  const events = [];
  const audioPlayerFile = path.join(root, "src/utils/audio-player.ts");
  const synthesisFile = path.join(root, "src/utils/minimax-synthesis.ts");
  const textSourceFile = path.join(root, "src/utils/text-source.ts");
  const readingSessionFile = path.join(root, "src/utils/reading-session.ts");
  const playbackStateFile = path.join(root, "src/utils/playback-state.ts");
  const playbackSpeedFile = path.join(root, "src/utils/playback-speed.ts");

  const mod = loadTs("src/utils/reading-runner.ts", {
    "@raycast/api": {
      showHUD: async (message) => events.push(`hud:${message}`),
    },
    [audioPlayerFile]: {
      AudioPlayer: class {
        isStopped() {
          return false;
        }
        cleanup() {
          events.push("player:cleanup");
        }
        playAudio(audio) {
          events.push(`play:start:${audio}`);
          return delay(20).then(() => {
            events.push(`play:done:${audio}`);
          });
        }
      },
      clearExternalStopRequest: () => events.push("stop:clear"),
      hasExternalStopRequest: () => false,
    },
    [synthesisFile]: {
      synthesizeMiniMaxChunk: async (text) => synthesize(events, text),
      startMiniMaxSynthesisJob: (text) => {
        const promise = synthesize(events, text);
        return {
          promise,
          cancel: () => events.push(`synth:cancel:${text}`),
        };
      },
    },
    [textSourceFile]: {
      formatTextSource: (source) => source,
    },
    [readingSessionFile]: {
      saveReadingSession: async () => undefined,
      updateReadingProgress: async (session, nextChunkIndex) => ({ ...session, nextChunkIndex }),
    },
    [playbackStateFile]: {
      buildTextPreview: (text) => text.slice(0, 20),
      clearPlaybackState: async () => events.push("state:clear"),
      writePlaybackState: async (state) => events.push(`state:${state.phase}:${state.chunkIndex}`),
    },
    [playbackSpeedFile]: {
      clampSpeed: (speed) => speed,
      clearPlaybackSpeed: async () => events.push("speed:clear"),
      formatSpeed: (speed) => `${speed}x`,
      readPlaybackSpeed: async () => 1,
      writePlaybackSpeed: async (speed) => events.push(`speed:write:${speed}`),
    },
  });

  await mod.playReadingSession({
    textHash: "hash",
    text: "one two three",
    source: "selection",
    chunks: ["one", "two", "three"],
    nextChunkIndex: 0,
    options: {
      voiceId: "voice",
      model: "speech-2.8-hd",
      speed: 1,
      languageBoost: "auto",
      region: "cn",
      format: "mp3",
      sampleRate: 32000,
      bitrate: 128000,
    },
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  });

  assert(
    before(events, "synth:start:two", "play:start:audio:one"),
    "MiniMax should start synthesizing chunk 2 before playing chunk 1",
  );
  assert(
    before(events, "synth:start:three", "play:start:audio:two"),
    "MiniMax should start synthesizing chunk 3 before playing chunk 2",
  );
  assert(
    events.filter((event) => event.startsWith("play:start:")).length === 3,
    "MiniMax should play every synthesized chunk",
  );
}

async function verifyMiniMaxLookaheadSpeedInvalidation() {
  const events = [];
  const speeds = [1, 1.25, 1.25];
  const mod = loadMiniMaxRunner(events, {
    readPlaybackSpeed: async () => speeds.shift() ?? 1.25,
  });

  await mod.playReadingSession(makeMiniMaxSession());

  assert(
    events.includes("synth:cancel:two:1"),
    "MiniMax should cancel a lookahead chunk synthesized at the old speed",
  );
  assert(
    events.includes("synth:start:two:1.25"),
    "MiniMax should re-synthesize the current chunk at the new speed",
  );
  assert(
    events.includes("play:start:audio:two:1.25"),
    "MiniMax should play the re-synthesized chunk at the new speed",
  );
  assert(
    !events.includes("play:start:audio:two:1"),
    "MiniMax should not play stale lookahead audio after a speed change",
  );
}

async function verifyMiniMaxLookaheadCancellationOnStop() {
  const events = [];
  const mod = loadMiniMaxRunner(events, {
    hasExternalStopRequest: () => events.includes("play:done:audio:one:1"),
    playDelayMs: 5,
    synthesize: async (eventLog, text, speed) => {
      eventLog.push(`synth:start:${text}:${speed}`);
      await delay(text === "two" ? 50 : 5);
      eventLog.push(`synth:done:${text}:${speed}`);
      return `audio:${text}:${speed}`;
    },
  });

  await mod.playReadingSession(makeMiniMaxSession());
  await delay(60);

  assert(
    events.includes("synth:start:two:1"),
    "MiniMax should start a lookahead job before the stop request is observed",
  );
  assert(events.includes("synth:cancel:two:1"), "MiniMax should cancel pending lookahead after stop");
  assert(!events.includes("play:start:audio:two:1"), "MiniMax should not play lookahead audio after stop");
  assert(
    !events.includes("progress:1"),
    "MiniMax should not mark a chunk complete after playback was externally stopped",
  );
}

function loadMiniMaxRunner(events, overrides = {}) {
  const audioPlayerFile = path.join(root, "src/utils/audio-player.ts");
  const synthesisFile = path.join(root, "src/utils/minimax-synthesis.ts");
  const textSourceFile = path.join(root, "src/utils/text-source.ts");
  const readingSessionFile = path.join(root, "src/utils/reading-session.ts");
  const playbackStateFile = path.join(root, "src/utils/playback-state.ts");
  const playbackSpeedFile = path.join(root, "src/utils/playback-speed.ts");

  return loadTs("src/utils/reading-runner.ts", {
    "@raycast/api": {
      showHUD: async (message) => events.push(`hud:${message}`),
    },
    [audioPlayerFile]: {
      AudioPlayer: class {
        isStopped() {
          return overrides.isStopped?.() ?? false;
        }
        cleanup() {
          events.push("player:cleanup");
        }
        playAudio(audio) {
          events.push(`play:start:${audio}`);
          return delay(overrides.playDelayMs ?? 20).then(() => {
            events.push(`play:done:${audio}`);
          });
        }
      },
      clearExternalStopRequest: () => events.push("stop:clear"),
      hasExternalStopRequest: overrides.hasExternalStopRequest ?? (() => false),
    },
    [synthesisFile]: {
      synthesizeMiniMaxChunk: async (text, options) =>
        (overrides.synthesize ?? synthesize)(events, text, options.speed),
      startMiniMaxSynthesisJob: (text, options) => {
        const promise = (overrides.synthesize ?? synthesize)(events, text, options.speed);
        return {
          promise,
          cancel: () => events.push(`synth:cancel:${text}:${options.speed}`),
        };
      },
    },
    [textSourceFile]: {
      formatTextSource: (source) => source,
    },
    [readingSessionFile]: {
      saveReadingSession: async () => undefined,
      updateReadingProgress: async (session, nextChunkIndex) => {
        events.push(`progress:${nextChunkIndex}`);
        return { ...session, nextChunkIndex };
      },
    },
    [playbackStateFile]: {
      buildTextPreview: (text) => text.slice(0, 20),
      clearPlaybackState: async () => events.push("state:clear"),
      writePlaybackState: async (state) => events.push(`state:${state.phase}:${state.chunkIndex}`),
    },
    [playbackSpeedFile]: {
      clampSpeed: (speed) => speed,
      clearPlaybackSpeed: async () => events.push("speed:clear"),
      formatSpeed: (speed) => `${speed}x`,
      readPlaybackSpeed: overrides.readPlaybackSpeed ?? (async () => 1),
      writePlaybackSpeed: async (speed) => events.push(`speed:write:${speed}`),
    },
  });
}

function makeMiniMaxSession() {
  return {
    textHash: "hash",
    text: "one two three",
    source: "selection",
    chunks: ["one", "two", "three"],
    nextChunkIndex: 0,
    options: {
      voiceId: "voice",
      model: "speech-2.8-hd",
      speed: 1,
      languageBoost: "auto",
      region: "cn",
      format: "mp3",
      sampleRate: 32000,
      bitrate: 128000,
    },
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };
}

async function verifyPipeline({ label, modulePath, apiPath, statePath, options }) {
  const events = [];
  const apiFile = path.join(root, apiPath);
  const stateFile = path.join(root, statePath);
  const audioPlayerFile = path.join(root, "src/utils/audio-player.ts");
  const mod = loadTs(modulePath, {
    [apiFile]: {
      synthesizeSpeech: async (text) => {
        events.push(`synth:start:${text}`);
        await delay(5);
        events.push(`synth:done:${text}`);
        return `audio:${text}`;
      },
    },
    [stateFile]: {
      hasPlaybackStopRequest: async () => false,
    },
    [audioPlayerFile]: {},
  });

  const player = {
    signal: new AbortController().signal,
    isStopped: () => false,
    stopPlayback: () => events.push("player:stop"),
    playAudio: async (audio) => {
      events.push(`play:start:${audio}`);
      await delay(20);
      events.push(`play:done:${audio}`);
    },
  };

  const chunks = ["one", "two", "three"];
  await mod.playChunksWithLookahead(chunks, options, player);

  assert(
    before(events, "synth:start:two", "play:start:audio:one"),
    `${label} should start synthesizing chunk 2 before playing chunk 1`,
  );
  assert(
    before(events, "synth:start:three", "play:start:audio:two"),
    `${label} should start synthesizing chunk 3 before playing chunk 2`,
  );
  assert(
    events.filter((event) => event.startsWith("play:start:")).length === chunks.length,
    `${label} should play every synthesized chunk`,
  );
}

async function verifyPipelineStopsBeforeNextPlayback({ label, modulePath, apiPath, statePath, options }) {
  const events = [];
  const apiFile = path.join(root, apiPath);
  const stateFile = path.join(root, statePath);
  const audioPlayerFile = path.join(root, "src/utils/audio-player.ts");
  const mod = loadTs(modulePath, {
    [apiFile]: {
      synthesizeSpeech: async (text, _options, signal) => {
        events.push(`synth:start:${text}`);
        await delay(text === "two" ? 25 : 5);
        if (signal?.aborted) {
          events.push(`synth:aborted:${text}`);
          throw new Error("aborted");
        }
        events.push(`synth:done:${text}`);
        return `audio:${text}`;
      },
    },
    [stateFile]: {
      hasPlaybackStopRequest: async () => events.includes("play:done:audio:one"),
    },
    [audioPlayerFile]: {},
  });

  const controller = new AbortController();
  const player = {
    signal: controller.signal,
    isStopped: () => controller.signal.aborted,
    stopPlayback: () => {
      events.push("player:stop");
      controller.abort();
    },
    playAudio: async (audio) => {
      events.push(`play:start:${audio}`);
      await delay(5);
      events.push(`play:done:${audio}`);
    },
  };

  await mod.playChunksWithLookahead(["one", "two", "three"], options, player);
  await delay(30);

  assert(events.includes("synth:start:two"), `${label} should start a lookahead synthesis job`);
  assert(events.includes("player:stop"), `${label} should stop the player after a stop request`);
  assert(!events.includes("play:start:audio:two"), `${label} should not play lookahead audio after stop`);
}

function loadTs(relativePath, stubs) {
  const filename = path.join(root, relativePath);
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2023,
    },
    fileName: filename,
  }).outputText;

  const mod = new Module(filename);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  const nativeRequire = mod.require.bind(mod);

  mod.require = (request) => {
    if (request in stubs) return stubs[request];
    if (request.startsWith(".")) {
      const resolved = resolveTs(path.resolve(path.dirname(filename), request));
      if (resolved in stubs) return stubs[resolved];
    }
    return nativeRequire(request);
  };

  mod._compile(compiled, filename);
  return mod.exports;
}

function resolveTs(candidate) {
  const candidates = [candidate, `${candidate}.ts`, `${candidate}.tsx`, `${candidate}.js`];
  const found = candidates.find((file) => fs.existsSync(file) && fs.statSync(file).isFile());
  if (!found) throw new Error(`Cannot resolve module ${candidate}`);
  return found;
}

function before(events, left, right) {
  const leftIndex = events.indexOf(left);
  const rightIndex = events.indexOf(right);
  return leftIndex >= 0 && rightIndex >= 0 && leftIndex < rightIndex;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function synthesize(events, text, speed) {
  const suffix = speed === undefined ? "" : `:${speed}`;
  events.push(`synth:start:${text}${suffix}`);
  await delay(5);
  events.push(`synth:done:${text}${suffix}`);
  return `audio:${text}${suffix}`;
}
