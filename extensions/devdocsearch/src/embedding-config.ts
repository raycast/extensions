import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export type EmbeddingConfig = {
  provider: "mlx" | "openai" | "ollama";
  endpoint: string;
  model: string;
  apiKeyFile?: string;
};

export const defaultEmbeddingConfig: EmbeddingConfig = { provider: "mlx", endpoint: "", model: "" };
export const embeddingConfigPath = () => join(homedir(), ".context", "docs", "embedding.json");

export async function readEmbeddingConfig(): Promise<EmbeddingConfig> {
  try {
    const config = JSON.parse(await readFile(embeddingConfigPath(), "utf8")) as EmbeddingConfig;
    return validateEmbeddingConfig(config);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return defaultEmbeddingConfig;
    throw error;
  }
}

export function validateEmbeddingConfig(config: EmbeddingConfig): EmbeddingConfig {
  if (config.provider === "mlx") {
    const model = config.model.trim();
    if (model && !/^agentmish\/pplx-embed-v1-0\.6b-mlx@[0-9a-f]{40}$/.test(model)) {
      throw new Error("Choose a downloaded MLX embedding model.");
    }
    return { provider: "mlx", endpoint: "", model };
  }
  if (config.provider !== "openai" && config.provider !== "ollama") throw new Error("Choose an embedding provider.");
  const model = config.model.trim();
  if (!model) throw new Error("Enter an embedding model ID.");
  let url: URL;
  try { url = new URL(config.endpoint.trim()); }
  catch { throw new Error("Enter a valid embedding endpoint URL."); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error("Use an HTTP or HTTPS endpoint without credentials, query, or fragment.");
  }
  const path = url.pathname.replace(/\/$/, "");
  if (config.provider === "ollama" && path && path !== "/api/embed") {
    throw new Error("Use an Ollama server root or its /api/embed URL.");
  }
  return { provider: config.provider, endpoint: url.toString().replace(/\/$/, ""), model, ...(config.apiKeyFile ? { apiKeyFile: config.apiKeyFile } : {}) };
}

export async function saveEmbeddingConfig(config: EmbeddingConfig, apiKey: string, path = embeddingConfigPath()): Promise<void> {
  const checked = validateEmbeddingConfig(config);
  if (apiKey.trim()) {
    const authDir = join(homedir(), ".auth");
    await mkdir(authDir, { recursive: true, mode: 0o700 });
    const keyPath = join(authDir, "docsearch-embedding-key");
    await writeFile(keyPath, apiKey.trim(), { mode: 0o600 });
    await chmod(keyPath, 0o600);
    checked.apiKeyFile = keyPath;
  }
  await mkdir(dirname(path), { recursive: true });
  const temp = `${path}.${randomUUID()}.tmp`;
  await writeFile(temp, JSON.stringify(checked, null, 2), { mode: 0o600 });
  await rename(temp, path);
}
