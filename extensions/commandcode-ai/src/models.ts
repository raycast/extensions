import { Cache, getPreferenceValues, type AI } from "@raycast/api";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export const API_URL = "https://api.commandcode.ai/alpha/generate";
export const DEFAULT_MODEL = "deepseek/deepseek-v4-flash";
// Sent as x-command-code-version until the catalog has been fetched once.
const FALLBACK_CLI_VERSION = "1.74.1";
const MAX_TOOL_NAME_LENGTH = 64;

interface CatalogModel {
  id: string;
  label: string;
  description?: string;
  vendor?: string;
  vision: boolean;
  contextWindow?: number;
  maxOutputTokens?: number;
  reasoningEfforts?: string[];
}

interface Catalog {
  version: string;
  models: CatalogModel[];
}

const cache = new Cache();

export function getApiKey(): string {
  const { COMMANDCODE_API_KEY } = getPreferenceValues<Preferences>();
  if (COMMANDCODE_API_KEY) return COMMANDCODE_API_KEY;
  try {
    const { apiKey } = JSON.parse(readFileSync(join(homedir(), ".commandcode", "auth.json"), "utf8"));
    if (typeof apiKey === "string" && apiKey) return apiKey;
  } catch {
    // fall through
  }
  throw new Error("No CommandCode API key. Set one in extension preferences, or run `cmd login`.");
}

function readCachedCatalog(): Catalog | undefined {
  const raw = cache.get("catalog");
  return raw ? (JSON.parse(raw) as Catalog) : undefined;
}

/**
 * CommandCode has no model-list endpoint: the catalog ships inside the `command-code` CLI bundle.
 * Pull it from the latest published version, re-downloading only when that version changes.
 */
export async function fetchCatalog(): Promise<Catalog> {
  const cached = readCachedCatalog();
  let version: string;
  try {
    const res = await fetch("https://registry.npmjs.org/command-code/latest", { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    version = ((await res.json()) as { version: string }).version;
  } catch (error) {
    if (cached) return cached;
    throw new Error(
      `Could not check the latest CommandCode version: ${error instanceof Error ? error.message : error}`,
    );
  }
  if (cached?.version === version) return cached;

  const res = await fetch(`https://cdn.jsdelivr.net/npm/command-code@${version}/dist/cli.mjs`, {
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`Could not download the CommandCode model catalog (HTTP ${res.status}).`);
  const models = parseCatalog(await res.text());
  // ponytail: scrapes the minified CLI bundle; switch to a real endpoint if CommandCode ever ships one.
  if (models.length === 0) throw new Error(`Could not read the model catalog from command-code@${version}.`);
  const catalog = { version, models };
  cache.set("catalog", JSON.stringify(catalog));
  return catalog;
}

export function parseCatalog(bundle: string): CatalogModel[] {
  const models: CatalogModel[] = [];
  const entry = /\{id:"([^"]+)",inputModalities:\[([^\]]*)\]/g;
  for (let match = entry.exec(bundle); match; match = entry.exec(bundle)) {
    let end = match.index + 1;
    for (let depth = 1; depth > 0 && end < bundle.length; end++) {
      if (bundle[end] === "{") depth++;
      else if (bundle[end] === "}") depth--;
    }
    const body = bundle.slice(match.index, end);
    if (/[,{]hidden:!0/.test(body)) continue;
    const str = (key: string) => body.match(new RegExp(`[,{]${key}:"([^"]*)"`))?.[1];
    const num = (key: string) => {
      const value = Number(body.match(new RegExp(`[,{]${key}:([\\d.e]+)`))?.[1]);
      return Number.isFinite(value) && value > 0 ? value : undefined;
    };
    const efforts = body.match(/[,{]reasoningEfforts:\[([^\]]*)\]/)?.[1].match(/[a-z]+/g) ?? undefined;
    models.push({
      id: match[1],
      label: str("label") ?? match[1],
      description: str("description"),
      vendor: str("vendorLabel"),
      vision: match[2].includes('"image"'),
      contextWindow: num("contextWindow"),
      maxOutputTokens: num("maxOutputTokens"),
      reasoningEfforts: efforts,
    });
  }
  return models;
}

export const getModels: AI.GetModels = async () => {
  const { models } = await fetchCatalog();
  return models.map((m) => ({
    id: m.id,
    title: m.label,
    icon: "extension-icon.png",
    description: m.description,
    contextWindow: m.contextWindow,
    capabilities: {
      systemMessage: { supported: true },
      streaming: { supported: true },
      temperature: { supported: true },
      tools: { supported: true },
      ...(m.vision ? { vision: { mediaTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"] } } : {}),
      ...(m.reasoningEfforts?.length
        ? {
            reasoningEffort: {
              supported: true,
              options: m.reasoningEfforts,
              default: m.reasoningEfforts.includes("medium") ? "medium" : m.reasoningEfforts[0],
            },
          }
        : {}),
    },
  }));
};

type GenerateRequest = Omit<AI.ModelRequest, "providerOptions"> & { reasoningEffort?: string };

export const streamCompletion: AI.StreamCompletion = (model, request) =>
  generate(model.id, { ...request, reasoningEffort: request.providerOptions?.raycast?.reasoningEffort });

export async function* generate(modelId: string, request: GenerateRequest): AsyncGenerator<AI.ModelStreamPart> {
  const catalog = readCachedCatalog();
  const info = catalog?.models.find((m) => m.id === modelId);
  const { system, messages, restoreName, tools } = toWire(request);
  const effort = request.reasoningEffort;

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
      "User-Agent": "cli",
      "x-command-code-version": catalog?.version ?? FALLBACK_CLI_VERSION,
      "x-cli-environment": "production",
    },
    body: JSON.stringify({
      config: {
        workingDir: homedir(),
        date: new Date().toISOString().slice(0, 10),
        environment: "raycast",
        structure: [],
        isGitRepo: false,
        currentBranch: "",
        mainBranch: "",
        gitStatus: "",
        recentCommits: [],
      },
      memory: null,
      taste: null,
      skills: null,
      permissionMode: "standard",
      params: {
        model: modelId,
        messages,
        tools,
        system,
        max_tokens: info?.maxOutputTokens ?? 64_000,
        stream: true,
        ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
        ...(effort && info?.reasoningEfforts?.includes(effort) ? { reasoning_effort: effort } : {}),
      },
    }),
  });
  if (!res.ok || !res.body) throw new Error(await errorMessage(res));

  // The API streams AI SDK stream parts as newline-delimited JSON — the same shape Raycast expects.
  const decoder = new TextDecoder();
  let buffer = "";
  const parse = (line: string): AI.ModelStreamPart | undefined => {
    try {
      const part = JSON.parse(line);
      if (typeof part.toolName === "string" && restoreName.has(part.toolName)) {
        part.toolName = restoreName.get(part.toolName);
      }
      if (part.type === "tool-call" && part.input === undefined) part.input = part.args;
      return part;
    } catch {
      return undefined;
    }
  };
  for await (const chunk of res.body as AsyncIterable<Uint8Array>) {
    buffer += decoder.decode(chunk, { stream: true });
    let newline = buffer.indexOf("\n");
    while (newline >= 0) {
      const part = parse(buffer.slice(0, newline).trim());
      buffer = buffer.slice(newline + 1);
      if (part) yield part;
      newline = buffer.indexOf("\n");
    }
  }
  const last = parse(buffer.trim());
  if (last) yield last;
}

async function errorMessage(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  try {
    const message = JSON.parse(text)?.error?.message;
    if (typeof message === "string") return message;
  } catch {
    // not JSON
  }
  if (res.status === 401) return "CommandCode rejected the API key. Check extension preferences or run `cmd login`.";
  return `CommandCode request failed (HTTP ${res.status})${text ? `: ${text.slice(0, 200)}` : ""}`;
}

/** Tool names are capped at 64 chars upstream; shorten deterministically and map back. */
function toWireToolName(name: string): string {
  if (name.length <= MAX_TOOL_NAME_LENGTH) return name;
  let hash = 0x811c9dc5;
  for (let i = 0; i < name.length; i++) hash = Math.imul(hash ^ name.charCodeAt(i), 0x01000193);
  return `${name.slice(0, MAX_TOOL_NAME_LENGTH - 9)}_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function toDataUrl(data: string | Uint8Array | ArrayBuffer | URL, mediaType: string): string {
  if (data instanceof URL) return data.href;
  if (typeof data === "string") return /^(data:|https?:)/.test(data) ? data : `data:${mediaType};base64,${data}`;
  return `data:${mediaType};base64,${Buffer.from(data instanceof ArrayBuffer ? new Uint8Array(data) : data).toString("base64")}`;
}

function toWire(request: GenerateRequest) {
  const restoreName = new Map<string, string>();
  const tools = Object.entries(request.tools ?? {}).map(([name, definition]) => {
    const wireName = toWireToolName(name);
    if (wireName !== name) restoreName.set(wireName, name);
    return {
      name: wireName,
      description: definition.description ?? "",
      input_schema: definition.inputSchema ?? { type: "object", properties: {} },
    };
  });

  const system = request.system ? [request.system] : [];
  const messages: unknown[] = [];
  for (const message of request.messages ?? []) {
    if (message.role === "system") {
      system.push(message.content);
    } else if (message.role === "user") {
      messages.push({
        role: "user",
        content: message.content.map((p) =>
          p.type === "file" ? { type: "image", image: toDataUrl(p.data, p.mediaType), mimeType: p.mediaType } : p,
        ),
      });
    } else if (message.role === "assistant") {
      // Reasoning is dropped: Raycast doesn't keep the provider signatures it would need.
      const content = message.content.flatMap((p): unknown[] => {
        if (p.type === "text") return [p];
        if (p.type === "tool-call") return [{ ...p, toolName: toWireToolName(p.toolName) }];
        return [];
      });
      if (content.length) messages.push({ role: "assistant", content });
    } else {
      messages.push({
        role: "tool",
        content: message.content.map((p) => ({
          type: "tool-result",
          toolCallId: p.toolCallId,
          toolName: toWireToolName(p.toolName),
          output: {
            type: "text",
            value: typeof p.output.value === "string" ? p.output.value : JSON.stringify(p.output.value),
          },
        })),
      });
    }
  }

  return { system: system.join("\n\n") || undefined, messages, tools, restoreName };
}
