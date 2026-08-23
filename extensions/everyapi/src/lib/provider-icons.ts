const providerIcons: Record<string, string> = {
  anthropic: "provider-anthropic.svg",
  aws: "provider-aws.svg",
  azure: "provider-azure.svg",
  byteplus: "provider-byteplus.svg",
  deepseek: "provider-deepseek.svg",
  google: "provider-google-gemini.svg",
  groq: "provider-groq.svg",
  meta: "provider-meta.svg",
  minimax: "provider-minimax.svg",
  mistral: "provider-mistral.svg",
  openai: "provider-openai.svg",
  openrouter: "provider-openrouter.svg",
  qwen: "provider-qwen.svg",
  xai: "provider-xai.svg",
};

export function providerIcon(provider: string): string | undefined {
  const value = provider.toLowerCase().replace(/[^a-z0-9]/g, "");
  const alias =
    Object.entries({
      anthropic: ["anthropic", "claude"],
      aws: ["aws", "amazon", "bedrock"],
      azure: ["azure", "microsoft"],
      byteplus: ["byteplus", "bytedance"],
      deepseek: ["deepseek"],
      google: ["google", "gemini", "vertex"],
      groq: ["groq"],
      meta: ["meta", "llama"],
      minimax: ["minimax"],
      mistral: ["mistral", "mixtral"],
      openrouter: ["openrouter"],
      qwen: ["qwen", "alibaba"],
      xai: ["xai", "grok"],
    }).find(([, aliases]) =>
      aliases.some((item) => value.includes(item)),
    )?.[0] ?? (value.includes("openai") ? "openai" : undefined);
  return alias ? providerIcons[alias] : undefined;
}

const statusProviderIcons: Record<string, string> = {
  anthropic: "provider-anthropic.svg",
  aws: "provider-aws.svg",
  azure: "provider-azure.svg",
  byteplus: "provider-byteplus.svg",
  deepseek: "provider-deepseek.svg",
  google: "provider-google-gemini.svg",
  groq: "provider-groq.svg",
  minimax: "provider-minimax.svg",
  mistral: "provider-mistral.svg",
  openai: "provider-openai.svg",
  openrouter: "provider-openrouter.svg",
  xai: "provider-xai.svg",
};

export function statusProviderIcon(id: string): string | undefined {
  return statusProviderIcons[id.trim().toLowerCase()];
}

export function modelProviderIcon(model: string): string | undefined {
  const id = model.trim().toLowerCase();
  if (/^(gpt|o[1345]-|chatgpt)/.test(id)) return providerIcon("OpenAI");
  if (id.includes("claude")) return providerIcon("Anthropic");
  if (id.includes("gemini")) return providerIcon("Google");
  if (id.includes("minimax")) return providerIcon("Minimax");
  if (id.includes("deepseek")) return providerIcon("DeepSeek");
  if (id.includes("mistral") || id.includes("mixtral"))
    return providerIcon("Mistral");
  if (id.includes("qwen")) return providerIcon("Qwen");
  if (id.includes("llama")) return providerIcon("Meta");
  if (id.includes("grok")) return providerIcon("xAI");
  return undefined;
}
