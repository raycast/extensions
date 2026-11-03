import type { ProviderId } from "../core/types";
import { directProviderOf, type DirectProviderId } from "./filters";

/** Direct providers each form one family. */
const DIRECT_FAMILIES: Record<DirectProviderId, string> = {
  anthropic: "Claude",
  openai: "GPT",
  gemini: "Gemini",
};

/** OpenRouter vendor prefix to the family name shown in the dropdown. */
const OPENROUTER_FAMILIES: Record<string, string> = {
  deepseek: "DeepSeek",
  mistralai: "Mistral",
  "x-ai": "Grok",
  "z-ai": "GLM",
  moonshotai: "Kimi",
  qwen: "Qwen",
};

/** Brand spellings that capitalizing words would get wrong. Everything else is prettified automatically. */
const BRAND_NAMES: Record<string, string> = { openai: "OpenAI", google: "Google", nvidia: "NVIDIA", ibm: "IBM" };

/** Dropdown order: direct providers first, then the known OpenRouter vendors, then the rest alphabetically. */
const FAMILY_ORDER = ["Claude", "GPT", "Gemini", "DeepSeek", "Mistral", "Grok", "GLM", "Kimi", "Qwen", "Muse"];

export function familyRank(family: string): number {
  const index = FAMILY_ORDER.indexOf(family);
  return index === -1 ? FAMILY_ORDER.length : index;
}

/** "ibm-granite" becomes "IBM Granite", "meta-llama" becomes "Meta Llama". */
export function prettifyVendor(vendor: string): string {
  return vendor
    .split(/[-_]+/)
    .filter((word) => word !== "")
    .map((word) => BRAND_NAMES[word.toLowerCase()] ?? word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function deriveFamily(provider: ProviderId, modelId: string): string {
  if (provider !== "openrouter") return DIRECT_FAMILIES[provider];
  // Claude stays "Claude", whichever route serves it.
  const direct = directProviderOf(modelId);
  if (direct) return DIRECT_FAMILIES[direct];
  // `~vendor/` marks OpenRouter's "latest" aliases; they belong to the vendor's family.
  const [rawVendor, rest = ""] = modelId.toLowerCase().replace(/^~/, "").split("/", 2);
  const vendor = rawVendor ?? "";
  // Meta's current line is branded Muse; older Llama models come from `meta-llama/`.
  if (vendor === "meta" && rest.startsWith("muse")) return "Muse";
  return OPENROUTER_FAMILIES[vendor] ?? (prettifyVendor(vendor) || "Other");
}

/**
 * Display name without the vendor noise. OpenRouter names look like "DeepSeek: DeepSeek V4.1 Flash"; the family
 * header already names the vendor, so only the part after the colon is kept.
 */
export function cleanDisplayName(modelId: string, rawName?: string): string {
  const name = (rawName ?? "")
    .replace(/^[^:]{1,40}:\s+/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (name !== "") return name;
  // Without a name the ID is the best label; Gemini IDs arrive as "models/<id>".
  return modelId.replace(/^models\//, "").replace(/^~?[^/]+\//, "");
}
