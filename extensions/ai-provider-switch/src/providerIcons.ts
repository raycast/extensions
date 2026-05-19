import { Color, environment, Icon, Image, LocalStorage } from "@raycast/api";
import * as fs from "fs";
import * as path from "path";
import { Provider } from "./types";

const PROVIDER_ICONS_STORAGE_KEY = "provider-icons-config-v1";
const CUSTOM_PROVIDER_ICONS_DIR = "provider-icons";
const ALLOWED_ICON_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".svg"];

export interface ProviderIconPreset {
  id: string;
  title: string;
  asset: string;
  aliases: string[];
}

export type ProviderIconRef =
  | { type: "preset"; presetId: string }
  | { type: "custom"; fileName: string };

export interface ProviderIconsConfig {
  iconsByProvider: Record<string, ProviderIconRef>;
}

export const EMPTY_PROVIDER_ICONS_CONFIG: ProviderIconsConfig = {
  iconsByProvider: {},
};

const PROVIDER_ICON_PRESET_DEFS: Array<{
  id: string;
  title: string;
  aliases: string[];
}> = [
  { id: "aihubmix", title: "AiHubMix", aliases: ["aihubmix"] },
  { id: "alibaba", title: "Alibaba", aliases: ["alibaba"] },
  { id: "anthropic", title: "Anthropic", aliases: ["anthropic"] },
  { id: "aws", title: "AWS", aliases: ["aws"] },
  { id: "azure", title: "Azure", aliases: ["azure"] },
  { id: "baidu", title: "Baidu", aliases: ["baidu"] },
  { id: "bailian", title: "Bailian", aliases: ["bailian"] },
  { id: "bytedance", title: "ByteDance", aliases: ["bytedance"] },
  { id: "chatglm", title: "ChatGLM", aliases: ["chatglm"] },
  { id: "claude", title: "Claude", aliases: ["claude"] },
  {
    id: "cli-proxy-api",
    title: "CLI Proxy API",
    aliases: ["cli-proxy-api", "cliproxyapi", "cliproxy"],
  },
  { id: "cloudflare", title: "Cloudflare", aliases: ["cloudflare"] },
  { id: "cohere", title: "Cohere", aliases: ["cohere"] },
  { id: "copilot", title: "Copilot", aliases: ["copilot"] },
  { id: "deepseek", title: "DeepSeek", aliases: ["deepseek"] },
  { id: "doubao", title: "Doubao", aliases: ["doubao"] },
  { id: "gemini", title: "Gemini", aliases: ["gemini"] },
  { id: "gemma", title: "Gemma", aliases: ["gemma"] },
  { id: "github", title: "GitHub", aliases: ["github"] },
  {
    id: "githubcopilot",
    title: "GitHub Copilot",
    aliases: ["githubcopilot"],
  },
  { id: "google", title: "Google", aliases: ["google"] },
  {
    id: "googlecloud",
    title: "Google Cloud",
    aliases: ["googlecloud", "gcp"],
  },
  { id: "grok", title: "Grok", aliases: ["grok"] },
  { id: "groq", title: "Groq", aliases: ["groq"] },
  { id: "hermes", title: "Hermes", aliases: ["hermes"] },
  { id: "huawei", title: "Huawei", aliases: ["huawei"] },
  {
    id: "huggingface",
    title: "Hugging Face",
    aliases: ["huggingface"],
  },
  { id: "hunyuan", title: "Hunyuan", aliases: ["hunyuan"] },
  { id: "kimi", title: "Kimi", aliases: ["kimi"] },
  { id: "longcat", title: "LongCat", aliases: ["longcat"] },
  { id: "mcp", title: "MCP", aliases: ["mcp"] },
  { id: "meta", title: "Meta", aliases: ["meta"] },
  { id: "midjourney", title: "Midjourney", aliases: ["midjourney"] },
  { id: "minimax", title: "MiniMax", aliases: ["minimax"] },
  { id: "mistral", title: "Mistral", aliases: ["mistral"] },
  { id: "modelscope", title: "ModelScope", aliases: ["modelscope"] },
  { id: "newapi", title: "NewAPI", aliases: ["newapi"] },
  { id: "notion", title: "Notion", aliases: ["notion"] },
  { id: "novita", title: "Novita AI", aliases: ["novita"] },
  { id: "nvidia", title: "NVIDIA", aliases: ["nvidia"] },
  { id: "ollama", title: "Ollama", aliases: ["ollama"] },
  { id: "openai", title: "OpenAI", aliases: ["openai", "chatgpt"] },
  { id: "openclaw", title: "OpenClaw", aliases: ["openclaw"] },
  { id: "opencode", title: "OpenCode", aliases: ["opencode"] },
  { id: "openrouter", title: "OpenRouter", aliases: ["openrouter"] },
  { id: "palm", title: "PaLM", aliases: ["palm"] },
  { id: "perplexity", title: "Perplexity", aliases: ["perplexity", "pplx"] },
  { id: "qwen", title: "Qwen", aliases: ["qwen"] },
  {
    id: "siliconflow",
    title: "SiliconFlow",
    aliases: ["siliconflow", "siliconcloud"],
  },
  {
    id: "stability",
    title: "Stability AI",
    aliases: ["stability", "stabilityai"],
  },
  { id: "stepfun", title: "StepFun", aliases: ["stepfun"] },
  { id: "tencent", title: "Tencent", aliases: ["tencent"] },
  { id: "vercel", title: "Vercel", aliases: ["vercel"] },
  { id: "wenxin", title: "Wenxin", aliases: ["wenxin"] },
  { id: "xai", title: "xAI", aliases: ["xai"] },
  { id: "xiaomimimo", title: "Xiaomi MiMo", aliases: ["xiaomimimo"] },
  { id: "yi", title: "Yi", aliases: ["yi"] },
  { id: "zeroone", title: "ZeroOne", aliases: ["zeroone"] },
  { id: "zhipu", title: "Zhipu AI", aliases: ["zhipu"] },
];

const MONOCHROME_PROVIDER_ICON_IDS = new Set([
  "anthropic",
  "aws",
  "github",
  "githubcopilot",
  "google",
  "googlecloud",
  "groq",
  "grok",
  "hermes",
  "mcp",
  "midjourney",
  "notion",
  "ollama",
  "opencode",
  "openai",
  "openrouter",
  "vercel",
  "xai",
  "xiaomimimo",
  "yi",
  "zeroone",
]);

export const PROVIDER_ICON_PRESETS: ProviderIconPreset[] = [
  ...PROVIDER_ICON_PRESET_DEFS.map((preset) => ({
    ...preset,
    asset: `provider-icons/${preset.id}.svg`,
  })),
  {
    id: "crazyrouter-fallback",
    title: "OpenRouter",
    asset: "provider-icons/openrouter.svg",
    aliases: ["crazyrouter"],
  },
];

export async function loadProviderIconsConfig(): Promise<ProviderIconsConfig> {
  const raw = await LocalStorage.getItem<string>(PROVIDER_ICONS_STORAGE_KEY);
  if (!raw) return EMPTY_PROVIDER_ICONS_CONFIG;

  try {
    const parsed = JSON.parse(raw) as Partial<ProviderIconsConfig>;
    if (!parsed || typeof parsed !== "object") {
      return EMPTY_PROVIDER_ICONS_CONFIG;
    }
    if (!parsed.iconsByProvider || typeof parsed.iconsByProvider !== "object") {
      return EMPTY_PROVIDER_ICONS_CONFIG;
    }
    return { iconsByProvider: parsed.iconsByProvider };
  } catch {
    return EMPTY_PROVIDER_ICONS_CONFIG;
  }
}

export async function saveProviderIconsConfig(
  config: ProviderIconsConfig,
): Promise<void> {
  const json = JSON.stringify(config);
  await LocalStorage.setItem(PROVIDER_ICONS_STORAGE_KEY, json);
}

export function resolveProviderListIcon(
  provider: Provider,
  config: ProviderIconsConfig,
): Image.ImageLike {
  const assigned = config.iconsByProvider[provider.id];

  if (assigned?.type === "custom") {
    const fullPath = getCustomIconPath(assigned.fileName);
    if (fs.existsSync(fullPath)) {
      return {
        source: fullPath,
        fallback: Icon.Globe,
      };
    }
  }

  if (assigned?.type === "preset") {
    const preset = getPresetById(assigned.presetId);
    if (preset) return getPresetIconImage(preset);
  }

  return getPresetIconImageByProvider(provider) || Icon.Globe;
}

export function setProviderPresetIcon(
  config: ProviderIconsConfig,
  providerId: string,
  presetId: string,
): ProviderIconsConfig {
  return {
    iconsByProvider: {
      ...config.iconsByProvider,
      [providerId]: { type: "preset", presetId },
    },
  };
}

export function setProviderCustomIcon(
  config: ProviderIconsConfig,
  providerId: string,
  fileName: string,
): ProviderIconsConfig {
  return {
    iconsByProvider: {
      ...config.iconsByProvider,
      [providerId]: { type: "custom", fileName },
    },
  };
}

export function removeProviderIcon(
  config: ProviderIconsConfig,
  providerId: string,
): ProviderIconsConfig {
  const iconsByProvider = { ...config.iconsByProvider };
  delete iconsByProvider[providerId];
  return { iconsByProvider };
}

export function duplicateProviderIcon(
  config: ProviderIconsConfig,
  fromProviderId: string,
  toProviderId: string,
): ProviderIconsConfig {
  const source = config.iconsByProvider[fromProviderId];
  if (!source) return config;
  return {
    iconsByProvider: {
      ...config.iconsByProvider,
      [toProviderId]: source,
    },
  };
}

export function getProviderIconRef(
  config: ProviderIconsConfig,
  providerId: string,
): ProviderIconRef | undefined {
  return config.iconsByProvider[providerId];
}

export function isCustomIconStillReferenced(
  config: ProviderIconsConfig,
  fileName: string,
): boolean {
  return Object.values(config.iconsByProvider).some(
    (ref) => ref.type === "custom" && ref.fileName === fileName,
  );
}

export function copyCustomIconToSupport(
  providerId: string,
  sourcePath: string,
): string {
  const extension = path.extname(sourcePath).toLowerCase();
  if (!ALLOWED_ICON_EXTENSIONS.includes(extension)) {
    throw new Error(
      `Unsupported image type "${extension}". Use ${ALLOWED_ICON_EXTENSIONS.join(", ")}`,
    );
  }
  if (!fs.existsSync(sourcePath) || !fs.lstatSync(sourcePath).isFile()) {
    throw new Error("Selected file does not exist");
  }

  const dir = getCustomIconsDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const safeProviderId = sanitizeProviderId(providerId);
  const fileName = `${safeProviderId}-${Date.now()}${extension}`;
  const targetPath = path.join(dir, fileName);
  fs.copyFileSync(sourcePath, targetPath);
  return fileName;
}

export function removeCustomIconFile(fileName: string): void {
  const fullPath = getCustomIconPath(fileName);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
}

export function getPresetIconImage(
  preset: ProviderIconPreset,
): Image.ImageLike {
  if (MONOCHROME_PROVIDER_ICON_IDS.has(preset.id)) {
    return {
      source: preset.asset,
      tintColor: Color.PrimaryText,
    };
  }

  return preset.asset;
}

function getPresetIconImageByProvider(
  provider: Provider,
): Image.ImageLike | undefined {
  const matched = findAutoPreset(provider);
  return matched ? getPresetIconImage(matched) : undefined;
}

function findAutoPreset(provider: Provider): ProviderIconPreset | undefined {
  const idNameBase = `${provider.id} ${provider.name} ${provider.base_url}`;
  const normalized = normalizeToken(idNameBase);
  return PROVIDER_ICON_PRESETS.find((preset) =>
    preset.aliases.some((alias) => normalized.includes(normalizeToken(alias))),
  );
}

function getPresetById(presetId: string): ProviderIconPreset | undefined {
  return PROVIDER_ICON_PRESETS.find((preset) => preset.id === presetId);
}

function getCustomIconsDir(): string {
  return path.join(environment.supportPath, CUSTOM_PROVIDER_ICONS_DIR);
}

function getCustomIconPath(fileName: string): string {
  return path.join(getCustomIconsDir(), fileName);
}

function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function sanitizeProviderId(providerId: string): string {
  return providerId.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
}
