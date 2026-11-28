const PROVIDERS: Record<string, string> = {
  ai21labs: "ai21",
  ai21: "ai21",
  lg: "lg",
  lgairesearch: "lg",
  nousresearch: "nousresearch",
  inception: "inception",
  inceptionlabs: "inception",
  tencenthunyuan: "hunyuan",
  bytedanceseed: "bytedance",
  openai: "openai",
  anthropic: "anthropic",
  google: "gemini",
  googledeepmind: "gemini",
  meta: "meta",
  metaai: "meta",
  xai: "xai",
  spacexai: "xai",
  deepseek: "deepseek",
  deepseekai: "deepseek",
  alibaba: "qwen",
  alibabacloud: "qwen",
  qwen: "qwen",
  kimi: "kimi",
  moonshotai: "kimi",
  moonshot: "kimi",
  mistral: "mistral",
  mistralai: "mistral",
  minimax: "minimax",
  nvidia: "nvidia",
  zai: "zai",
  zhipuai: "zai",
  zhipu: "zai",
  stepfun: "stepfun",
  step: "stepfun",
  cohere: "cohere",
  microsoft: "microsoft",
  microsoftazure: "microsoft",
  ibm: "ibm",
  amazon: "aws",
  aws: "aws",
  amazonwebservices: "aws",
  baidu: "baidu",
  bytedance: "bytedance",
  perplexity: "perplexity",
  perplexityai: "perplexity",
  tencent: "tencent",
};

export function providerAsset(creator: string): string | undefined {
  const key = creator.toLocaleLowerCase("en").replace(/[^a-z0-9]/g, "");
  const icon = PROVIDERS[key];
  return icon ? `providers/${icon}.svg` : undefined;
}

export function providerInitials(creator: string): string {
  return (
    creator
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => [...word][0] ?? "")
      .join("")
      .toLocaleUpperCase("en") || "AI"
  );
}
