import { readFile, readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { EmbeddingConfig } from "./embedding-config";

export type AvailableModel = { id: string; name: string };
export type DownloadedModel = AvailableModel & { directEmbedding: boolean };

export async function discoverDownloadedModels(roots = [join(homedir(), ".context/docsearch-models/hub"),
  join(homedir(), ".models/huggingface/hub"), join(homedir(), ".cache/huggingface/hub")]): Promise<DownloadedModel[]> {
  const models = new Map<string, DownloadedModel>();
  for (const root of roots) {
    const repos = await readdir(root).catch(() => []);
    for (const repo of repos.filter((name) => name.startsWith("models--"))) {
      const revisions = await readdir(join(root, repo, "snapshots")).catch(() => []);
      for (const revision of revisions) {
        const snapshot = join(root, repo, "snapshots", revision);
        try {
          const config = JSON.parse(await readFile(join(snapshot, "config.json"), "utf8")) as { model_type?: string };
          const weights = (await readdir(snapshot)).filter((name) => name.endsWith(".safetensors") || name.endsWith(".gguf"));
          if (!weights.length || !(await stat(join(snapshot, weights[0]))).isFile()) continue;
          const name = repo.slice("models--".length).replace("--", "/");
          const id = `${name}@${revision}`;
          models.set(id, { id, name, directEmbedding: name === "agentmish/pplx-embed-v1-0.6b-mlx" && config.model_type === "bidirectional_pplx_qwen3" });
        } catch { /* A partial or unrelated download is not selectable. */ }
      }
    }
  }
  return [...models.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function discoverLocalEmbeddingModels(): Promise<AvailableModel[]> {
  return (await discoverDownloadedModels()).filter((model) => model.directEmbedding);
}

export async function discoverServerModels(config: EmbeddingConfig): Promise<AvailableModel[]> {
  if (config.provider === "mlx") return [];
  const endpoint = new URL(config.endpoint);
  const headers: Record<string, string> = {};
  if (config.apiKeyFile) headers.Authorization = `Bearer ${(await readFile(config.apiKeyFile, "utf8")).trim()}`;
  const get = async (url: string): Promise<unknown> => {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error(`Model list returned HTTP ${response.status}`);
    return response.json();
  };
  let found: AvailableModel[];
  if (config.provider === "ollama") {
    const base = config.endpoint.replace(/\/api\/embed\/?$/, "").replace(/\/$/, "");
    const payload = await get(`${base}/api/tags`) as { models?: Array<{ name?: string }> };
    const names = (payload.models ?? []).filter((item) => typeof item.name === "string").map((item) => item.name!);
    const capabilities = await Promise.all(names.map(async (name) => {
      try {
        const response = await fetch(`${base}/api/show`, {
          method: "POST", headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ model: name }), signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) return false;
        const details = await response.json() as { capabilities?: string[] };
        return Array.isArray(details.capabilities) && details.capabilities.includes("embedding");
      } catch { return false; }
    }));
    found = names.filter((_, index) => capabilities[index]).map((name) => ({ id: name, name }));
  } else {
    try {
      const payload = await get(`${endpoint.origin}/api/v1/models`) as { models?: Array<{ type?: string; key?: string; display_name?: string }> };
      if (!Array.isArray(payload.models)) throw new Error("Not an LM Studio model list");
      found = payload.models.filter((item) => item.type === "embedding" && typeof item.key === "string")
        .map((item) => ({ id: item.key!, name: item.display_name || item.key! }));
    } catch {
      const base = config.endpoint.replace(/\/embeddings\/?$/, "").replace(/\/$/, "");
      const payload = await get(`${base}/models`) as { data?: Array<{ id?: string; type?: string }> };
      found = (payload.data ?? []).filter((item) => typeof item.id === "string" && (!item.type || item.type === "embedding" || item.type === "embeddings"))
        .map(({ id }) => ({ id: id!, name: id! }));
    }
  }
  return [...new Map(found.map((item) => [item.id, item])).values()].sort((a, b) => a.name.localeCompare(b.name));
}
