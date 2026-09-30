import fs from "node:fs";
import { AI, environment } from "@raycast/api";
import { runWithWatchdog } from "./run.js";

// The models Chat About Link can talk to. They share one small interface:
// send instructions + a prompt, stream the text back. Budgets are in estimated
// prompt tokens (see `estimateTokens`) and leave room for the answer.

export type EngineId = "raycast" | "apple" | "ollama";
export type EnginePreference = EngineId | "auto";

export const ENGINE_TITLES: Record<EngineId, string> = {
  raycast: "Raycast AI",
  apple: "Apple Intelligence (On-Device)",
  ollama: "Ollama (Local)",
};

export type EngineSettings = {
  /** An `AI.Model` value, or empty for Raycast's default. */
  raycastModel?: string;
  ollamaUrl: string;
  /** Empty picks the first model Ollama has installed. */
  ollamaModel?: string;
  /** Ollama `num_ctx`. */
  ollamaContext: number;
};

/** Engine settings from the extension's preferences. */
export function engineSettings(prefs: ExtensionPreferences): EngineSettings {
  const context = Number.parseInt(prefs.ollamaContext ?? "", 10);
  return {
    raycastModel: prefs.raycastModel || undefined,
    ollamaUrl: prefs.ollamaUrl?.trim() || "http://127.0.0.1:11434",
    ollamaModel: prefs.ollamaModel?.trim() || undefined,
    ollamaContext: Number.isFinite(context) && context >= 2048 ? context : 8192,
  };
}

export type CompleteOptions = {
  signal?: AbortSignal;
  /** Called with the full text so far each time more arrives. */
  onData?: (text: string) => void;
  /** A short note while the engine is busy before its first words (e.g. loading a model); undefined clears it. */
  onStatus?: (status: string | undefined) => void;
  /** Local image files to look at, for engines that can (`seesImages`). */
  images?: string[];
};

export interface Engine {
  id: EngineId;
  title: string;
  /** How many prompt tokens one request may carry. */
  contextBudget: number;
  /** Prompt tokens to keep free for each image sent along. */
  imageTokens: number;
  /** True when the engine (or its current model) can look at images. */
  seesImages(): Promise<boolean>;
  complete(instructions: string, prompt: string, options?: CompleteOptions): Promise<string>;
}

/**
 * Shows `message` through `onStatus` when an engine has said nothing for
 * `afterMs` (a model loading, or reading a long prompt), so the chat doesn't
 * look stuck. Call the returned function when words arrive or the request ends.
 */
function slowStartNotice(onStatus: CompleteOptions["onStatus"], message: string, afterMs: number): () => void {
  if (!onStatus) return () => undefined;
  let shown = false;
  const timer = setTimeout(() => {
    shown = true;
    onStatus(message);
  }, afterMs);
  return () => {
    clearTimeout(timer);
    if (shown) onStatus(undefined);
    shown = false;
  };
}

/** macOS 27's command-line front end to Apple's Foundation Models. */
export const FM_PATH = "/usr/bin/fm";

// ---------------------------------------------------------------------------
// Raycast AI
// ---------------------------------------------------------------------------

export function raycastEngine(model?: string): Engine {
  return {
    id: "raycast",
    title: ENGINE_TITLES.raycast,
    // Raycast-hosted models have large windows; stay well inside the smaller ones.
    contextBudget: 90_000,
    // The extension AI API takes text only.
    imageTokens: 0,
    seesImages: async () => false,
    async complete(instructions, prompt, options = {}) {
      const request = AI.ask(`${instructions}\n\n${prompt}`, {
        creativity: "low",
        model: model ? (model as AI.Model) : undefined,
        signal: options.signal,
      });
      let text = "";
      request.on("data", (chunk: string) => {
        text += chunk;
        options.onData?.(text);
      });
      const final = await request;
      return final || text;
    },
  };
}

export function raycastAvailable(): boolean {
  try {
    return environment.canAccess(AI);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Apple Intelligence via `fm` (macOS 27)
// ---------------------------------------------------------------------------

/**
 * Apple's guardrail level for transforming text the user provides (summarizing,
 * extracting, answering from it) — what every chat request is. The default
 * level refused ordinary videos: taking notes on a Japanese history video
 * stopped mid-answer with "The model's safety guardrails were triggered."
 */
const FM_GUARDRAILS = "permissive-content-transformations";

/**
 * `fm respond` arguments. `--stream` is fm's default but is spelled out so the
 * text keeps arriving as it's generated. fm has one model, the on-device
 * `system` one (`--model` accepts nothing else on macOS 27), so there's no
 * Private Cloud option. The prompt is positional and last; ours always starts
 * with text, never a dash.
 */
export function buildFmArgs(instructions: string, prompt: string, images: string[] = []): string[] {
  const base = ["respond", "--instructions", instructions, "--stream", "--guardrails", FM_GUARDRAILS];
  // With images, fm takes the text as a --text segment next to each --image.
  return images.length
    ? [...base, ...images.flatMap((image) => ["--image", image]), "--text", prompt]
    : [...base, prompt];
}

const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;?]*[A-Za-z]`, "g");

export function stripAnsi(text: string): string {
  return text.replace(ANSI, "");
}

/** How long fm may stay silent before the chat says the model is getting ready. */
const APPLE_NOTICE_MS = 5_000;

/** fm's exit code when its one-time Legal Notice & Terms haven't been accepted. */
const FM_EXIT_TERMS = 69;

/** Turn `fm`'s output on failure into something the user can act on. */
export function friendlyFmError(stderr: string, code: number | null): string {
  const text = stripAnsi(stderr).trim();
  if (code === FM_EXIT_TERMS || /not agreed|legal notice/i.test(text)) {
    return "Apple's `fm` tool needs its terms accepted once: run `sudo fm license` in Terminal, then try again.";
  }
  if (/modelNotReady|model is not available/i.test(text)) {
    return "Apple Intelligence isn't ready yet. If you just turned it on, it's still downloading its model (System Settings → Apple Intelligence & Siri). Try again later, or pick another AI engine.";
  }
  if (/appleIntelligenceNotEnabled|not enabled/i.test(text)) {
    return "Apple Intelligence is off. Turn it on in System Settings → Apple Intelligence & Siri, or pick another AI engine.";
  }
  if (/deviceNotEligible|not eligible/i.test(text)) {
    return "This Mac doesn't support Apple Intelligence. Pick another AI engine.";
  }
  if (/context|too (long|large)|exceed/i.test(text)) {
    return "The request was too long for Apple's on-device model. Try a narrower question, or switch to Raycast AI or Ollama.";
  }
  if (/rate.?limit/i.test(text)) {
    return "Apple's model is busy right now. Try again in a moment.";
  }
  if (/guardrail|unsafe/i.test(text)) {
    return "Apple's model declined to answer this. Try rephrasing, or pick another AI engine.";
  }
  // A framework error with no words of its own, e.g. the safety classifier
  // failing on every request while `fm available` still says ready.
  const internal = /couldn.t be completed\.\s*\(([^)]+)\)/i.exec(text);
  if (internal) {
    return `Apple Intelligence couldn't answer just now (${internal[1].trim().replace(/\.$/, "")}). This usually clears up on its own — try again in a few minutes, or pick another AI engine.`;
  }
  return text || `fm exited with code ${code ?? "unknown"}`;
}

export function appleEngine(): Engine {
  return {
    id: "apple",
    title: ENGINE_TITLES.apple,
    // The on-device model's window is 8,192 tokens for the prompt and the
    // answer together (measured with fm on macOS 27); this leaves ~3,000 to answer.
    contextBudget: 4_500,
    // Measured on macOS 27: an image, from a 512 px icon to a 1440×1800 photo,
    // takes well under 300 tokens of the window.
    imageTokens: 300,
    seesImages: async () => true,
    async complete(instructions, prompt, options = {}) {
      let text = "";
      // Warm, the first words take 2–4 s; loading the model after a break, or
      // reading a long prompt, can take 40 s or more.
      const clearNotice = slowStartNotice(
        options.onStatus,
        "Apple Intelligence is getting ready… The first answer after a break, or on a long video, can take up to a minute.",
        APPLE_NOTICE_MS,
      );
      try {
        const { code, stderr } = await runWithWatchdog(FM_PATH, buildFmArgs(instructions, prompt, options.images), {
          idleMs: 120_000,
          abortSignal: options.signal,
          onStdoutChunk: (chunk) => {
            clearNotice();
            text += stripAnsi(chunk);
            options.onData?.(text.trimStart());
          },
          idleKillMessage: "Apple's model stopped responding. Try again, or pick another AI engine.",
        });
        if (code !== 0) throw new Error(friendlyFmError(stderr, code));
        return text.trim();
      } finally {
        clearNotice();
      }
    },
  };
}

export type FmAvailability = { available: boolean; reason?: string };

/** Read `fm available`: exit 0 means ready; otherwise it prints `System model unavailable: <reason>`. */
export function parseFmAvailability(output: string, code: number | null): FmAvailability {
  if (code === 0) return { available: true };
  if (code === FM_EXIT_TERMS) return { available: false, reason: "license" };
  const reason = /unavailable:\s*(\w+)/i.exec(stripAnsi(output))?.[1];
  return reason ? { available: false, reason } : { available: false };
}

/**
 * True when Apple's on-device model can answer right now — installed, terms
 * accepted, Apple Intelligence on and its model downloaded. `fm` alone existing
 * isn't enough: Automatic would pick an engine that can only fail.
 */
export async function appleAvailable(): Promise<boolean> {
  if (process.platform !== "darwin" || !fs.existsSync(FM_PATH)) return false;
  try {
    const { code, stdout, stderr } = await runWithWatchdog(FM_PATH, ["available"], { idleMs: 5_000 });
    return parseFmAvailability(`${stdout}\n${stderr}`, code).available;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Ollama
// ---------------------------------------------------------------------------

/** How long Ollama may stay silent before the chat says it's loading the model. */
const LOADING_NOTICE_MS = 1_500;

function base(url: string): string {
  return url.replace(/\/+$/, "");
}

/** Read an NDJSON response body, calling `onLine` for each parsed object. */
export async function readNdjson(body: ReadableStream<Uint8Array>, onLine: (value: unknown) => void): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split("\n");
    buffer = done ? "" : (lines.pop() ?? "");
    for (const line of lines) if (line.trim()) onLine(JSON.parse(line));
    if (done) break;
  }
}

export async function firstOllamaModel(url: string, signal?: AbortSignal): Promise<string> {
  const res = await fetch(`${base(url)}/api/tags`, { signal });
  if (!res.ok) throw new Error(`Ollama returned ${res.status}`);
  const data = (await res.json()) as { models?: { name: string }[] };
  const name = data.models?.[0]?.name;
  if (!name) throw new Error("Ollama has no models installed. Run `ollama pull llama3.2` (or any model) first.");
  return name;
}

export function ollamaEngine(settings: EngineSettings): Engine {
  return {
    id: "ollama",
    title: ENGINE_TITLES.ollama,
    contextBudget: Math.max(2_000, Math.floor(settings.ollamaContext * 0.6)),
    // Vision models spend a few hundred to ~1,600 tokens per image; keep a middle amount free.
    imageTokens: 800,
    async seesImages() {
      try {
        const model = settings.ollamaModel?.trim() || (await firstOllamaModel(settings.ollamaUrl));
        const res = await fetch(`${base(settings.ollamaUrl)}/api/show`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ model }),
          signal: AbortSignal.timeout(3_000),
        });
        if (!res.ok) return false;
        const info = (await res.json()) as { capabilities?: string[] };
        return info.capabilities?.includes("vision") ?? false;
      } catch {
        return false;
      }
    },
    async complete(instructions, prompt, options = {}) {
      let res: Response;
      // The first request after a while makes Ollama load the model into memory,
      // which can take many seconds before the first word: say so instead of
      // looking stuck.
      let clearLoading: () => void = () => undefined;
      try {
        const model = settings.ollamaModel?.trim() || (await firstOllamaModel(settings.ollamaUrl, options.signal));
        clearLoading = slowStartNotice(
          options.onStatus,
          `Loading ${model} in Ollama… The first answer after a break takes a moment.`,
          LOADING_NOTICE_MS,
        );
        res = await fetch(`${base(settings.ollamaUrl)}/api/chat`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          signal: options.signal,
          body: JSON.stringify({
            model,
            stream: true,
            messages: [
              { role: "system", content: instructions },
              {
                role: "user",
                content: prompt,
                ...(options.images?.length
                  ? { images: options.images.map((file) => fs.readFileSync(file).toString("base64")) }
                  : {}),
              },
            ],
            options: { num_ctx: settings.ollamaContext, temperature: 0.2 },
          }),
        });
      } catch (error) {
        clearLoading();
        if (error instanceof Error && error.name === "AbortError") throw error;
        if (error instanceof Error && /no models installed/.test(error.message)) throw error;
        throw new Error(`Couldn't reach Ollama at ${settings.ollamaUrl}. Is it running? (${String(error)})`);
      }
      if (!res.ok || !res.body) {
        clearLoading();
        throw new Error(`Ollama returned ${res.status}: ${await res.text().catch(() => "")}`);
      }
      let text = "";
      try {
        await readNdjson(res.body, (value) => {
          const part = value as { error?: string; message?: { content?: string } };
          if (part.error) throw new Error(`Ollama: ${part.error}`);
          const content = part.message?.content ?? "";
          if (content) clearLoading();
          text += content;
          options.onData?.(text);
        });
      } finally {
        clearLoading();
      }
      return text.trim();
    },
  };
}

export async function ollamaAvailable(url: string, timeoutMs = 800): Promise<boolean> {
  try {
    const res = await fetch(`${base(url)}/api/tags`, { signal: AbortSignal.timeout(timeoutMs) });
    return res.ok;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------

export function createEngine(id: EngineId, settings: EngineSettings): Engine {
  switch (id) {
    case "raycast":
      return raycastEngine(settings.raycastModel);
    case "apple":
      return appleEngine();
    case "ollama":
      return ollamaEngine(settings);
  }
}

/**
 * The engine to use. `auto` prefers Raycast AI when the user has access, then
 * Apple's on-device model, then a running Ollama; with none of those it returns
 * Raycast AI, which offers Raycast Pro when asked.
 */
export async function resolveEngine(preference: EnginePreference, settings: EngineSettings): Promise<Engine> {
  // An engine saved by an older version (the removed Private Cloud) counts as Automatic.
  if (preference !== "auto" && preference in ENGINE_TITLES) return createEngine(preference, settings);
  if (raycastAvailable()) return createEngine("raycast", settings);
  if (await appleAvailable()) return createEngine("apple", settings);
  if (await ollamaAvailable(settings.ollamaUrl)) return createEngine("ollama", settings);
  return createEngine("raycast", settings);
}
