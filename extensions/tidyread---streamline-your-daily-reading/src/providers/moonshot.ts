import { ProviderOptions } from "../types";
import { OpenaiProvider } from "./openai";

function normalizeModel(name?: string) {
  if (!name) return "moonshot-v1-8k";
  if (!name.includes("moonshot")) return "moonshot-v1-8k";
  return name;
}

class MoonshotProvider extends OpenaiProvider {
  constructor(options: ProviderOptions) {
    super({
      ...options,
      apiHost: options.apiHost || "https://api.moonshot.cn",
      apiModel: normalizeModel(options?.apiModel),
    });

    if (!options.apiKey) {
      this.available = false;
    }
  }
}

export { MoonshotProvider };
