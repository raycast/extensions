import fs from "node:fs";
import { AI, environment } from "@raycast/api";
import { runWithWatchdog } from "./run.js";

// The models Chat About Video can talk to. They share one small interface:
// send instructions + a prompt, stream the text back. Budgets are in estimated
// prompt tokens (see `estimateTokens`) and leave room for the answer.

export type EngineId = "raycast" | "apple" | "apple-pcc" | "ollama";
export type EnginePreference = EngineId | "auto";

export const ENGINE_TITLES: Record<EngineId, string> = {
  raycast: "Raycast AI",
  apple: "Apple Intelligence (On-Device)",
  "apple-pcc": "Apple Intelligence (Private Cloud)",
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

export type CompleteOptions = {
  signal?: AbortSignal;
  /** Called with the full text so far each time more arrives. */
  onData?: (text: string) => void;
};

export interface Engine {
  id: EngineId;
  title: string;
  /** How many prompt tokens one request may carry. */
  contextBudget: number;
  complete(instructions: string, prompt: string, options?: CompleteOptions): Promise<string>;
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

export function buildFmArgs(instructions: string, prompt: string, privateCloud: boolean): string[] {
  // The prompt is positional; ours always starts with text, never a dash.
  return ["respond", prompt, "--instructions", instructions, ...(privateCloud ? ["--model", "pcc"] : [])];
}

const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;?]*[A-Za-z]`, "g");

export function stripAnsi(text: string): string {
  return text.replace(ANSI, "");
}

/** Turn `fm`'s stderr into something the user can act on. */
export function friendlyFmError(stderr: string, code: number | null): string {
  const text = stripAnsi(stderr).trim();
  if (/not (enabled|available|supported)|unavailable|apple intelligence/i.test(text)) {
    return "Apple Intelligence isn't available. Turn it on in System Settings → Apple Intelligence & Siri (Apple silicon, macOS 27), or pick another AI engine.";
  }
  if (/context|too (long|large)|exceed/i.test(text)) {
    return "The request was too long for Apple's model. Try a narrower question, or switch to Private Cloud or Raycast AI.";
  }
  if (/limit|quota|rate/i.test(text)) {
    return "Apple's Private Cloud usage limit was reached. Try again later, or use the on-device model.";
  }
  return text || `fm exited with code ${code ?? "unknown"}`;
}

export function appleEngine(privateCloud: boolean): Engine {
  const id: EngineId = privateCloud ? "apple-pcc" : "apple";
  return {
    id,
    title: ENGINE_TITLES[id],
    // On-device: 8,192-token window. Private Cloud Compute: 32,000.
    contextBudget: privateCloud ? 22_000 : 4_500,
    async complete(instructions, prompt, options = {}) {
      let text = "";
      const { code, stderr } = await runWithWatchdog(FM_PATH, buildFmArgs(instructions, prompt, privateCloud), {
        idleMs: 120_000,
        abortSignal: options.signal,
        onStdoutChunk: (chunk) => {
          text += stripAnsi(chunk);
          options.onData?.(text.trimStart());
        },
        idleKillMessage: "Apple's model stopped responding. Try again, or pick another AI engine.",
      });
      if (code !== 0) throw new Error(friendlyFmError(stderr, code));
      return text.trim();
    },
  };
}

export function appleAvailable(): boolean {
  return process.platform === "darwin" && fs.existsSync(FM_PATH);
}

// ---------------------------------------------------------------------------
// Ollama
// ---------------------------------------------------------------------------

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
    async complete(instructions, prompt, options = {}) {
      let res: Response;
      try {
        const model = settings.ollamaModel?.trim() || (await firstOllamaModel(settings.ollamaUrl, options.signal));
        res = await fetch(`${base(settings.ollamaUrl)}/api/chat`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          signal: options.signal,
          body: JSON.stringify({
            model,
            stream: true,
            messages: [
              { role: "system", content: instructions },
              { role: "user", content: prompt },
            ],
            options: { num_ctx: settings.ollamaContext, temperature: 0.2 },
          }),
        });
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") throw error;
        if (error instanceof Error && /no models installed/.test(error.message)) throw error;
        throw new Error(`Couldn't reach Ollama at ${settings.ollamaUrl}. Is it running? (${String(error)})`);
      }
      if (!res.ok || !res.body) throw new Error(`Ollama returned ${res.status}: ${await res.text().catch(() => "")}`);
      let text = "";
      await readNdjson(res.body, (value) => {
        const part = value as { error?: string; message?: { content?: string } };
        if (part.error) throw new Error(`Ollama: ${part.error}`);
        text += part.message?.content ?? "";
        options.onData?.(text);
      });
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
      return appleEngine(false);
    case "apple-pcc":
      return appleEngine(true);
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
  if (preference !== "auto") return createEngine(preference, settings);
  if (raycastAvailable()) return createEngine("raycast", settings);
  if (appleAvailable()) return createEngine("apple", settings);
  if (await ollamaAvailable(settings.ollamaUrl)) return createEngine("ollama", settings);
  return createEngine("raycast", settings);
}
