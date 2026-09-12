import path from "node:path";
import { createTsLoader } from "./lib/ts-loader.mjs";

const root = process.cwd();

const providers = [
  {
    label: "Qwen-TTS",
    modulePath: "src/utils/qwen-pipelined-reading.ts",
    apiPath: "src/api/qwen-tts.ts",
    statePath: "src/utils/qwen-playback-state.ts",
    options: { format: "wav", playbackRate: 1 },
  },
  {
    label: "MiMo",
    modulePath: "src/utils/mimo-pipelined-reading.ts",
    apiPath: "src/api/mimo-tts.ts",
    statePath: "src/utils/mimo-playback-state.ts",
    options: { format: "wav", playbackRate: 1 },
  },
  {
    label: "OpenAI",
    modulePath: "src/utils/openai-pipelined-reading.ts",
    apiPath: "src/api/openai-tts.ts",
    statePath: "src/utils/openai-playback-state.ts",
    options: { format: "mp3", playbackRate: 1 },
  },
];

for (const provider of providers) {
  await verifyPipeline(provider);
  await verifyPipelineStopsBeforeNextPlayback(provider);
  await verifyPipelineAbortsDuringSynthesis(provider);
}
await verifyChunkEnginePrefetchUsesNextChunkOptions();

console.log(
  JSON.stringify(
    {
      checked: [
        "Qwen-TTS lookahead starts next synthesis before playback",
        "Qwen-TTS lookahead stops before playing the next chunk",
        "Qwen-TTS stop requests abort in-flight synthesis",
        "MiMo lookahead starts next synthesis before playback",
        "MiMo lookahead stops before playing the next chunk",
        "MiMo stop requests abort in-flight synthesis",
        "OpenAI lookahead starts next synthesis before playback",
        "OpenAI lookahead stops before playing the next chunk",
        "OpenAI stop requests abort in-flight synthesis",
        "Shared chunk engine resolves next chunk options before prefetch",
      ],
    },
    null,
    2,
  ),
);

async function verifyPipeline({ label, modulePath, apiPath, statePath, options }) {
  const events = [];
  const mod = loadPipelineModule(
    { modulePath, apiPath, statePath },
    {
      synthesizeSpeech: async (text) => {
        events.push(`synth:start:${text}`);
        await delay(5);
        events.push(`synth:done:${text}`);
        return `audio:${text}`;
      },
      hasPlaybackStopRequest: async () => false,
    },
  );

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

async function verifyChunkEnginePrefetchUsesNextChunkOptions() {
  const events = [];
  const mod = loadTs("src/utils/chunk-playback-engine.ts");
  const optionsByIndex = [{ key: "one" }, { key: "two" }, { key: "three" }];

  await mod.playChunkSequence({
    total: optionsByIndex.length,
    startIndex: 0,
    player: {},
    shouldStop: async () => false,
    stopCheckAtLoopTop: false,
    stopCheckBeforeOutcome: false,
    stopCheckAfterAdvance: false,
    resolveOptions: async (index) => {
      const options = optionsByIndex[index];
      events.push(`options:${index}:${options.key}`);
      return options;
    },
    optionsKey: (options) => options.key,
    startJob: (index, options) => {
      events.push(`job:${index}:${options.key}`);
      return {
        outcome: Promise.resolve({ kind: "audio", audio: `audio:${index}:${options.key}` }),
        cancel: () => events.push(`cancel:${index}:${options.key}`),
      };
    },
    errorIsStop: () => false,
    onError: (_index, _total, cause) => {
      throw cause;
    },
    onPhase: (phase, index, _total, options) => events.push(`phase:${phase}:${index}:${options.key}`),
    play: async (audio, options) => {
      events.push(`play:${audio}:${options.key}`);
    },
  });

  assert(events.includes("job:1:two"), "Prefetch for chunk 2 should use chunk 2 options");
  assert(events.includes("job:2:three"), "Prefetch for chunk 3 should use chunk 3 options");
  assert(!events.includes("job:1:one"), "Prefetch for chunk 2 should not reuse chunk 1 options");
  assert(!events.includes("job:2:two"), "Prefetch for chunk 3 should not reuse chunk 2 options");
}

async function verifyPipelineStopsBeforeNextPlayback({ label, modulePath, apiPath, statePath, options }) {
  const events = [];
  const mod = loadPipelineModule(
    { modulePath, apiPath, statePath },
    {
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
      hasPlaybackStopRequest: async () => events.includes("play:done:audio:one"),
    },
  );

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

async function verifyPipelineAbortsDuringSynthesis({ label, modulePath, apiPath, statePath, options }) {
  const events = [];
  const mod = loadPipelineModule(
    { modulePath, apiPath, statePath },
    {
      synthesizeSpeech: (text, _options, signal) =>
        new Promise((resolve, reject) => {
          events.push(`synth:start:${text}`);
          signal?.addEventListener(
            "abort",
            () => {
              events.push(`synth:aborted:${text}`);
              reject(new Error("aborted"));
            },
            { once: true },
          );
          setTimeout(() => {
            if (signal?.aborted) return;
            events.push(`synth:done:${text}`);
            resolve(`audio:${text}`);
          }, 1000);
        }),
      hasPlaybackStopRequest: async () => events.includes("synth:start:one"),
    },
  );

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
    },
  };

  await mod.playChunksWithLookahead(["one", "two"], options, player);

  assert(events.includes("player:stop"), `${label} should stop the player while synthesis is in flight`);
  assert(events.includes("synth:aborted:one"), `${label} should abort the in-flight synthesis request`);
  assert(!events.some((event) => event.startsWith("play:start:")), `${label} should not play audio after synth stop`);
}

function loadTs(relativePath, stubs = {}) {
  return createTsLoader({ overrides: stubs })(relativePath);
}

function loadPipelineModule({ modulePath, apiPath, statePath }, { synthesizeSpeech, hasPlaybackStopRequest }) {
  const apiFile = path.join(root, apiPath);
  const stateFile = path.join(root, statePath);
  const audioPlayerFile = path.join(root, "src/utils/audio-player.ts");
  return loadTs(modulePath, {
    [apiFile]: { synthesizeSpeech },
    [stateFile]: { hasPlaybackStopRequest },
    [audioPlayerFile]: {},
  });
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
