import { Ollama as OllamaClient } from "ollama";
import * as Types from "./types";

/** Model lifecycle client. Inference belongs to the provider/AI SDK layer. */
export class OllamaManager {
  private readonly client: OllamaClient;

  constructor(server: Types.OllamaServer = { url: "http://127.0.0.1:11434" }) {
    const headers: Record<string, string> = {};
    if (server.auth?.mode === "Basic") {
      headers.Authorization = `Basic ${btoa(`${server.auth.username}:${server.auth.password}`)}`;
    }
    if (server.auth?.mode === "Bearer" && server.auth.token) headers.Authorization = `Bearer ${server.auth.token}`;
    this.client = new OllamaClient({ host: server.url, headers });
  }

  async list(): Promise<Types.OllamaModel[]> {
    return (await this.client.list()).models as unknown as Types.OllamaModel[];
  }

  async show(model: string): Promise<Types.OllamaModelInfo> {
    return (await this.client.show({ model })) as Types.OllamaModelInfo;
  }

  async running(): Promise<Types.OllamaRunningModel[]> {
    return (await this.client.ps()).models as unknown as Types.OllamaRunningModel[];
  }

  async delete(model: string): Promise<void> {
    await this.client.delete({ model });
  }

  async setLoaded(model: string, keepAlive: 0 | -1): Promise<void> {
    await this.client.generate({ model, keep_alive: keepAlive, stream: false } as never);
  }

  async pull(model: string, onProgress: (progress: Types.OllamaPullProgress) => void): Promise<void> {
    const stream = await this.client.pull({ model, stream: true });
    for await (const progress of stream) onProgress(progress as Types.OllamaPullProgress);
  }
}
