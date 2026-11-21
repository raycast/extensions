import OpenAI from "openai";
import { SYSTEM_PROMPT, SYSTEM_PROMPT_WITH_WEB_SEARCH } from "./config";
import { getShellHistory } from "./history";
import { BuildContext } from "./context";
import { globalCache } from "./cache";
import { assessRisk, getLoginPath, missingPrograms, type Risk } from "./checks";

export interface EngineOptions {
  prompt: string;
  model: string;
  provider?: "openai" | "perplexity" | "ollama" | "raycast";
  webSearch?: boolean;
  apiKeys?: {
    openai?: string;
    perplexity?: string;
    ollama?: string;
    context7?: string;
  };
  urls?: {
    openaiUrl?: string;
    ollamaUrl?: string;
  };
  customModels?: {
    openai?: string;
  };
  /** Raycast host: do not treat process cwd/git as the user's project. */
  extensionHost?: boolean;
  /** Send recent shell commands as context (opt-in: history can hold secrets). */
  shellHistory?: boolean;
  /** Raycast AI bridge (`AI.ask`), injected by the extension so this module stays Raycast-free. */
  ask?: (prompt: string) => Promise<string>;
}

export type Platform = "macos" | "linux" | "windows" | "any";

export type Candidate = {
  command: string;
  platform: Platform;
  label?: string;
  explanation?: string;
  risk?: Risk;
  /** Why the risk isn't "safe", e.g. "rm -rf". */
  riskReason?: string;
  /** Programs it runs that aren't installed here. */
  missing?: string[];
};

export interface EngineResult {
  success: boolean;
  /** Best candidate for the target OS (same as `candidates[0].command`). */
  command?: string;
  /** All distinct commands the model proposed, best first. */
  candidates?: Candidate[];
  title: string;
  message?: string;
  source?: "context7" | "ai" | "cache";
}

const CTX7_TIMEOUT_MS = 5000;
const MAX_DOC_CHARS = 6000;

const normalizeBaseUrl = (url: string) => url.replace(/\/v1\/?$/, "") + "/v1";

// Stop-words stripped when deriving a Context7 library name from a free-form
// prompt. Keeping it tight so multi-word product names ("github copilot",
// "claude code") survive.
const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "in",
  "into",
  "is",
  "of",
  "on",
  "or",
  "the",
  "to",
  "via",
  "with",
  "install",
  "installing",
  "configure",
  "config",
  "set",
  "setup",
  "create",
  "make",
  "use",
  "using",
  "run",
  "show",
  "list",
  "find",
  "get",
  "all",
  "my",
  "globally",
  "global",
  "official",
  "cli",
  "tool",
  "command",
  "line",
  "macos",
  "linux",
  "windows",
  "ubuntu",
  "mac",
  "debian",
  "current",
  "directory",
  "this",
  "that",
]);

function deriveLibraryQuery(prompt: string): string {
  const tokens = prompt
    .toLowerCase()
    .replace(/[^a-z0-9@/\-_.\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
  return tokens.slice(0, 4).join(" ").trim();
}

function isTopicallyRelevant(title: string, prompt: string): boolean {
  const lowerPrompt = prompt.toLowerCase();
  const lowerTitle = title.toLowerCase().trim();
  if (!lowerTitle) return false;
  if (lowerPrompt.includes(lowerTitle)) return true;
  const titleTokens = lowerTitle
    .split(/[\s\-_/]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
  if (titleTokens.length === 0) return false;
  return titleTokens.every((t) => lowerPrompt.includes(t));
}

const CONTEXT7_API = "https://context7.com/api/v2";
// shortcut: trustScore >= 7 approximates Context7's "High" source reputation; tune if hits get noisy.
const MIN_TRUST_SCORE = 7;

export type Context7Library = {
  id: string;
  title: string;
  trustScore?: number;
  benchmarkScore?: number;
};

// Most-benchmarked trusted library that is actually about what the prompt names.
export function pickBestLibrary(
  results: Context7Library[],
  query: string,
): Context7Library | null {
  let best: Context7Library | null = null;
  for (const lib of results) {
    if ((lib.trustScore ?? 0) < MIN_TRUST_SCORE) continue;
    // Topical guard — e.g. "install bun" must not land on "Claude Code".
    if (!isTopicallyRelevant(lib.title, query)) continue;
    if (!best || rank(lib, query) > rank(best, query)) best = lib;
  }
  return best;
}

// Exact title named in the prompt ("Bun") beats a partial one ("Setup Bun"),
// then the higher benchmark wins.
const rank = (lib: Context7Library, query: string) =>
  (query.toLowerCase().includes(lib.title.toLowerCase().trim()) ? 1000 : 0) +
  (lib.benchmarkScore ?? 0);

async function context7Get(path: string, apiKey: string): Promise<Response> {
  const res = await fetch(`${CONTEXT7_API}${path}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(CTX7_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Context7 HTTP ${res.status}`);
  return res;
}

// Up-to-date docs for the tool the prompt names, used to ground the model.
async function getContext7Docs(
  query: string,
  context7ApiKey?: string,
): Promise<string | null> {
  const apiKey =
    context7ApiKey || process.env.CONTEXT7_API_KEY || process.env.CTX7_API_KEY;
  if (!apiKey) return null;

  const libraryQuery = deriveLibraryQuery(query);
  if (!libraryQuery) return null;

  try {
    const search = (await (
      await context7Get(
        `/libs/search?${new URLSearchParams({
          libraryName: libraryQuery,
          query,
        })}`,
        apiKey,
      )
    ).json()) as { results?: Context7Library[] };

    const best = pickBestLibrary(search.results ?? [], query);
    if (!best) return null;

    const docs = await (
      await context7Get(
        `/context?${new URLSearchParams({
          libraryId: best.id,
          query,
          type: "txt",
        })}`,
        apiKey,
      )
    ).text();
    return docs.trim() ? docs.slice(0, MAX_DOC_CHARS) : null;
  } catch {
    return null; // Context7 is best-effort; fall through to the AI provider.
  }
}

// Models (Raycast AI especially) sometimes ignore "raw command only" and reply
// with prose plus several fenced blocks: keep only the first command.
const FENCE_RE =
  /```(?:(?:bash|sh|shell|zsh|fish|console|terminal|text|powershell)\b)?[ \t]*\n?([\s\S]*?)```/i;

export function extractCommand(text: string): string {
  const trimmed = text.trim();
  const fenced = FENCE_RE.exec(trimmed)?.[1] ?? trimmed;
  return fenced
    .replace(/^```[\w-]*\s*/, "") // unclosed fence (answer cut off)
    .replace(/```$/, "")
    .trim()
    .replace(/^`([^`\n]+)`$/, "$1") // a lone inline-code answer
    .replace(/^\$\s+/gm, "") // "$ " prompt markers
    .trim();
}

// Command tokens are the most reliable OS signal; labels and the model's own
// tag are fallbacks. `brew` also exists on Linux but almost always means macOS.
const PLATFORM_HINTS: Array<[Exclude<Platform, "any">, RegExp]> = [
  [
    "windows",
    /\b(winget|choco|scoop|powershell|pwsh|iex|irm|setx|cmd\.exe)\b|\b(Invoke|Get|Set|New|Remove)-[A-Z]\w+|\.ps1\b/i,
  ],
  [
    "macos",
    /(^|[\s;&|(])(brew|mas|sips|pbcopy|pbpaste|defaults|launchctl|diskutil|osascript|xattr|mdfind|softwareupdate|networksetup|scutil|caffeinate|hdiutil|dscacheutil|pmset|tmutil|csrutil|spctl|codesign)\b|\bopen -a\b/,
  ],
  [
    "linux",
    /(^|[\s;&|(])(apt|apt-get|dpkg|dnf|yum|rpm|pacman|zypper|apk|snap|flatpak|systemctl|journalctl|xdg-open|ufw|update-alternatives)\b/,
  ],
];

const OS_WORDS: Array<[Exclude<Platform, "any">, RegExp]> = [
  ["windows", /\bwindows\b|\bwin(10|11)\b/i],
  ["macos", /\bmac ?os\b|\bmac\b|\bos x\b|\bhomebrew\b/i],
  [
    "linux",
    /\blinux\b|\bubuntu\b|\bdebian\b|\bfedora\b|\barch\b|\bcentos\b|\brhel\b|\balpine\b/i,
  ],
];

const findPlatform = (
  text: string,
  table: Array<[Exclude<Platform, "any">, RegExp]>,
): Platform | undefined => table.find(([, re]) => re.test(text))?.[0];

// Models tag these with the user's OS even though they run anywhere.
const CROSS_PLATFORM_RE =
  /^(sudo\s+)?(curl|wget|npm|npx|pnpm|yarn|bun|bunx|deno|node|pip|pip3|pipx|uv|python3?|cargo|rustup|go|git|gh|docker|kubectl|helm|terraform|ssh|scp|rsync|tar|zip|unzip|ffmpeg|jq|find|grep|ls|du|df|ps|kill|cat|echo)\b/;

// A label like "macOS (similar for Linux)" names two OSes, so it decides nothing.
const onlyPlatform = (text: string): Platform | undefined => {
  const named = OS_WORDS.filter(([, re]) => re.test(text));
  return named.length === 1 ? named[0][0] : undefined;
};

const asPlatform = (value: unknown): Platform | undefined => {
  const v = String(value ?? "").toLowerCase();
  if (v === "mac" || v === "darwin") return "macos";
  return (["macos", "linux", "windows", "any"] as const).find((p) => p === v);
};

export function classifyPlatform(
  command: string,
  label = "",
  modelTag?: unknown,
): Platform {
  return (
    findPlatform(command, PLATFORM_HINTS) ??
    onlyPlatform(label) ??
    (CROSS_PLATFORM_RE.test(command) ? "any" : undefined) ??
    asPlatform(modelTag) ??
    "any"
  );
}

/** OS the user asked about ("… on ubuntu"), else the machine we run on. */
const HOST_PLATFORM: Platform =
  process.platform === "darwin"
    ? "macos"
    : process.platform === "win32"
      ? "windows"
      : "linux";

export function targetPlatform(prompt: string): Platform {
  return findPlatform(prompt, OS_WORDS) ?? HOST_PLATFORM;
}

const cleanLabel = (text: string) => {
  const label = text
    .replace(/[*_`#>]/g, "")
    .replace(/[:.]\s*$/, "")
    .trim();
  return label.length > 48 ? `${label.slice(0, 47).trimEnd()}…` : label;
};

/**
 * Turns any model answer into candidates: the requested JSON (bare or fenced),
 * else every fenced block (labelled by the line before it), else the text.
 */
export function parseCandidates(raw: string): Candidate[] {
  const text = raw.trim();
  const json = text.match(/\{[\s\S]*\}/)?.[0];
  if (json) {
    try {
      const data = JSON.parse(json) as { commands?: unknown };
      if (Array.isArray(data.commands)) {
        const fromJson = data.commands
          .map(
            (c: {
              command?: unknown;
              label?: unknown;
              platform?: unknown;
              explanation?: unknown;
            }) => {
              const command = extractCommand(String(c?.command ?? ""));
              const intro = String(c?.label ?? "");
              const explanation = String(c?.explanation ?? "").trim();
              return {
                command,
                label: cleanLabel(intro) || undefined,
                ...(explanation && { explanation }),
                platform: classifyPlatform(command, intro, c?.platform),
              };
            },
          )
          .filter((c) => c.command);
        if (fromJson.length > 0) return fromJson;
      }
    } catch {
      /* not JSON — e.g. awk '{print $1}' in a prose answer */
    }
  }

  const fenced: Candidate[] = [];
  const fenceRe = new RegExp(FENCE_RE.source, "gi");
  let lastEnd = 0;
  for (const match of text.matchAll(fenceRe)) {
    const command = extractCommand(match[1] ?? "");
    const before = text.slice(lastEnd, match.index).split("\n");
    const intro = before.filter((l) => l.trim()).pop() ?? "";
    const label = cleanLabel(intro) || undefined;
    lastEnd = (match.index ?? 0) + match[0].length;
    if (command)
      fenced.push({
        command,
        label,
        platform: classifyPlatform(command, intro),
      });
  }
  if (fenced.length > 0) return fenced;

  const command = extractCommand(text);
  return command ? [{ command, platform: classifyPlatform(command) }] : [];
}

/** Prompt for changing an existing command; the history shows a short label. */
export const refinePrompt = (
  original: string,
  command: string,
  change: string,
) =>
  `Original request: ${original}\nPrevious command: ${command}\nChange: ${change}`;

/**
 * De-duplicates, then orders: fits the target OS and fully installed →
 * fits but needs a missing program → other OS. Model order within each.
 */
export function rankCandidates(
  candidates: Candidate[],
  target: Platform,
  max = 4,
): Candidate[] {
  const seen = new Set<string>();
  const unique = candidates.filter(
    (c) => !seen.has(c.command) && seen.add(c.command),
  );
  const tier = (c: Candidate) =>
    c.platform !== "any" && c.platform !== target
      ? 2
      : c.missing?.length
        ? 1
        : 0;
  return unique
    .map((c, i) => ({ c, i }))
    .sort((a, b) => tier(a.c) - tier(b.c) || a.i - b.i)
    .map(({ c }) => c)
    .slice(0, max);
}

/**
 * Adds risk, plus programs missing here — only for commands meant to run on
 * this machine (a Fedora command asked for on a Mac runs elsewhere).
 */
export async function annotateCandidates(
  candidates: Candidate[],
  target: Platform = HOST_PLATFORM,
): Promise<Candidate[]> {
  const pathDirs = await getLoginPath();
  return candidates.map((c) => {
    const { risk, reason } = assessRisk(c.command);
    const runsHere =
      target === HOST_PLATFORM &&
      (c.platform === "any" || c.platform === HOST_PLATFORM);
    const missing = runsHere ? missingPrograms(c.command, pathDirs) : [];
    return {
      ...c,
      risk,
      riskReason: reason,
      missing: missing.length > 0 ? missing : undefined,
    };
  });
}

// Strict JSON schema for providers with native structured outputs (OpenAI).
const COMMANDS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["commands"],
  properties: {
    commands: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["command", "platform", "label", "explanation"],
        properties: {
          command: { type: "string" },
          platform: {
            type: "string",
            enum: ["macos", "linux", "windows", "any"],
          },
          label: { type: "string" },
          explanation: { type: "string" },
        },
      },
    },
  },
} as const;

// Commands that look like they carry credentials never leave the machine.
const SECRET_RE =
  /(token|secret|passw(or)?d|api[_-]?key|auth|bearer|credential|private[_-]?key)|\b(sk|pk|rk)-[\w-]{10,}|\bgh[pousr]_\w{20,}|\bxox[abprs]-|\bAKIA[0-9A-Z]{16}\b|:\/\/[^/\s:@]+:[^/\s@]+@/i;

export const looksSecret = (cmd: string) => SECRET_RE.test(cmd);

async function buildSystemPrompt(opts: {
  repoRoot?: string;
  shell?: string;
  webSearch?: boolean;
  shellHistory?: boolean;
  docs?: string | null;
}): Promise<string> {
  let prompt = opts.webSearch ? SYSTEM_PROMPT_WITH_WEB_SEARCH : SYSTEM_PROMPT;

  if (opts.repoRoot) {
    prompt += ` You are in a git repository at ${opts.repoRoot}. Consider the repository context when suggesting commands.`;
  }

  if (opts.shellHistory && opts.shell) {
    try {
      const recent = (await getShellHistory(opts.shell, 20))
        .filter((cmd) => !looksSecret(cmd))
        .slice(-10);
      if (recent.length > 0) {
        prompt += `\n\nRecent commands in this session:\n${recent
          .map((cmd, i) => `${i + 1}. ${cmd}`)
          .join("\n")}`;
      }
    } catch {
      /* history is best-effort */
    }
  }

  if (opts.docs) {
    prompt += `\n\nRelevant up-to-date documentation (prefer it over memory; it may be partial):\n${opts.docs}`;
  }

  return prompt;
}

export async function convertPrompt(
  options: EngineOptions,
): Promise<EngineResult> {
  const {
    prompt,
    model,
    provider = "openai",
    webSearch = false,
    apiKeys = {},
    urls = {},
    customModels = {},
    extensionHost = false,
    shellHistory = false,
    ask,
  } = options;

  const isOllama = provider === "ollama";
  const isOpenAI = provider === "openai";
  const isPerplexity = provider === "perplexity";
  const isRaycast = provider === "raycast";

  let resolvedModel = model;
  if (isOpenAI && webSearch) {
    resolvedModel = "gpt-5-search-api";
  } else if (isOpenAI && urls.openaiUrl && customModels.openai) {
    resolvedModel = customModels.openai;
  }

  const apiKey = isOpenAI
    ? apiKeys.openai
    : isPerplexity
      ? apiKeys.perplexity
      : apiKeys.ollama;

  if (isRaycast && !ask) {
    return {
      success: false,
      title: "Raycast AI unavailable",
      message: "Raycast AI only works inside the Raycast extension",
    };
  }
  if (!apiKey && !isOllama && !isRaycast) {
    return {
      success: false,
      title: "API key not configured",
      message: `Please provide ${provider} API key`,
    };
  }

  try {
    const cacheKey = [
      extensionHost ? "raycast" : process.cwd(),
      provider,
      resolvedModel,
      prompt,
    ].join("\x00");
    const cached = globalCache.get(cacheKey);
    if (cached) {
      // Re-checked on every hit: tools get installed between runs.
      const target = targetPlatform(prompt);
      const candidates = rankCandidates(
        await annotateCandidates(JSON.parse(cached) as Candidate[], target),
        target,
      );
      return {
        success: true,
        title: "Command generated",
        command: candidates[0].command,
        candidates,
        source: "cache",
      };
    }

    const docs = await getContext7Docs(prompt, apiKeys.context7);
    const context = BuildContext({
      useProcessWorkspace: !extensionHost,
    });
    const systemPrompt = await buildSystemPrompt({
      repoRoot: context.repoRoot,
      shell: context.shell,
      webSearch,
      shellHistory,
      docs,
    });

    let raw: string;
    if (isRaycast && ask) {
      // AI.ask takes a single prompt — prepend the system instructions.
      raw = await ask(
        `${systemPrompt}\n\nRequest: ${prompt}\n\nAnswer with the JSON only.`,
      );
    } else {
      const client = new OpenAI({
        apiKey: apiKey?.trim() || "ollama", // Ollama accepts any non-empty key
        baseURL: isOllama
          ? normalizeBaseUrl(urls.ollamaUrl || "http://localhost:11434")
          : isPerplexity
            ? "https://api.perplexity.ai"
            : urls.openaiUrl
              ? normalizeBaseUrl(urls.openaiUrl)
              : undefined,
      });
      const request = {
        model: resolvedModel,
        max_completion_tokens: 1024,
        ...(resolvedModel === "gpt-5-search-api" && { web_search_options: {} }),
        messages: [
          { role: "system" as const, content: systemPrompt },
          { role: "user" as const, content: prompt },
        ],
      };
      // Native structured outputs only where verified (api.openai.com); other
      // endpoints get the prompt + tolerant parser. Perplexity's schema mode
      // adds 10–30 s on first use, so it's skipped.
      const useSchema = isOpenAI && !urls.openaiUrl;
      const send = (withSchema: boolean) =>
        client.chat.completions.create({
          ...request,
          ...(withSchema && {
            response_format: {
              type: "json_schema" as const,
              json_schema: {
                name: "shell_commands",
                strict: true,
                schema: COMMANDS_SCHEMA,
              },
            },
          }),
        });
      const response = await send(useSchema).catch((error: unknown) => {
        // A model that rejects the schema still works without it.
        if (useSchema && (error as { status?: number })?.status === 400)
          return send(false);
        throw error;
      });
      const choice = response.choices[0];
      // A reply cut at the token limit is a partial command; never offer it.
      if (choice?.finish_reason === "length")
        return {
          success: false,
          title: "Answer was cut off",
          message: "Try again, or ask for something shorter",
        };
      raw = choice?.message.content ?? "";
    }

    const parsed = parseCandidates(raw);
    if (parsed.length === 0) {
      return { success: false, title: "No command generated" };
    }
    globalCache.put(cacheKey, JSON.stringify(parsed));
    const target = targetPlatform(prompt);
    const candidates = rankCandidates(
      await annotateCandidates(parsed, target),
      target,
    );
    return {
      success: true,
      title: "Command generated",
      command: candidates[0].command,
      candidates,
      source: docs ? "context7" : "ai",
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return { success: false, title: "API Error", message: errorMessage };
  }
}
