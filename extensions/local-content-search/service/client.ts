import { request } from "node:http";
import { StringDecoder } from "node:string_decoder";
import { paths } from "./paths";
import { Config, Hit, Status, PROTOCOL_VERSION } from "./protocol";

// Domain API hides Unix-socket mechanics from Raycast components and acceptance scripts.
const RESPONSE_BYTES = 4 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 35000;

export class LocalClient {
  constructor(private readonly socket = paths().socket) {}

  async status(): Promise<Status> {
    const status = await this.send<Status>("/status");
    if (status.version !== PROTOCOL_VERSION) {
      throw new Error(
        "Service version differs; reinstall the background service",
      );
    }
    return status;
  }

  configure(config: Config, expectedConfig?: Config): Promise<Status> {
    // UI callers send their displayed snapshot; the service rejects writes based on superseded settings.
    return this.send("/config", { ...config, expectedConfig });
  }
  rescan(): Promise<Status> {
    return this.send("/rescan", {});
  }
  async search(query: string, signal?: AbortSignal): Promise<Hit[]> {
    const response = await this.send<{ hits: Hit[] }>(
      "/search",
      { query },
      signal,
    );
    return response.hits;
  }

  private send<T>(
    route: string,
    body?: unknown,
    signal?: AbortSignal,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const req = request(
        {
          socketPath: this.socket,
          path: route,
          method: body === undefined ? "GET" : "POST",
          signal,
          timeout: REQUEST_TIMEOUT_MS,
          headers: { "Content-Type": "application/json" },
        },
        (res) => {
          // Decode across transport chunks so non-ASCII file paths and excerpts remain exact.
          const decoder = new StringDecoder();
          let bytes = 0,
            output = "";
          res.on("data", (chunk: Buffer) => {
            bytes += chunk.length;
            if (bytes > RESPONSE_BYTES) {
              req.destroy(
                new Error("Service response exceeded its size budget"),
              );
              return;
            }
            output += decoder.write(chunk);
          });
          res.on("error", reject);
          res.on("end", () => {
            try {
              const value = JSON.parse(output + decoder.end());
              if (res.statusCode !== 200) {
                reject(
                  new Error(value.error ?? "Local service request failed"),
                );
                return;
              }
              resolve(value);
            } catch {
              reject(new Error("Invalid response from local service"));
            }
          });
        },
      );
      req.on("timeout", () => {
        req.destroy(new Error("Local search timed out"));
      });
      req.on("error", (error: NodeJS.ErrnoException) => {
        if (error.code === "ENOENT" || error.code === "ECONNREFUSED") {
          reject(
            new Error(
              "Background service is not running. Open Install Local Content Search",
            ),
          );
          return;
        }
        reject(error);
      });
      req.end(body === undefined ? undefined : JSON.stringify(body));
    });
  }
}
