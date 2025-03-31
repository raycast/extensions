import { RequestInit } from "node-fetch";

export const OllamaMessageModelNotInstalled = new Error("Model is not Installed.");
export const OllamaVersion = new Error("Ollama version not supported, update at least at v0.1.14.");
export const OllamaNotInstalledOrRunning = new Error("Verify Ollama is Installed and Currently Running.");
export const OllamaModelRegistryUnreachable = new Error("Ollama Models Registry is Unreachable.");

export class OllamaModelNotInstalled extends Error {
  public readonly model?: string;
  public readonly suggest?: string;

  constructor(message: string, model?: string) {
    super(message);
    this.model = model;
    this.suggest = `Select a different model or install throw 'Manage Models' command`;
  }
}

/**
 * Custom Ollama Server Error.
 */
export class OllamaServerError extends Error {
  public readonly route: string;
  public readonly code: number;
  public readonly req?: RequestInit;

  constructor(message: string, route: string, code: number, req?: RequestInit) {
    super(message);
    this.route = route;
    this.code = code;
    this.req = req;
  }
}
