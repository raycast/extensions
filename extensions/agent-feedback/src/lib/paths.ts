import { environment } from "@raycast/api";
import { mkdirSync } from "fs";
import { join } from "path";

export const statePath = join(environment.supportPath, "recording-state.json");

export function ensureSupportDirectories(): void {
  mkdirSync(environment.supportPath, { recursive: true });
  mkdirSync(join(environment.supportPath, "sessions"), { recursive: true });
  mkdirSync(join(environment.supportPath, "models"), { recursive: true });
}

export function defaultModelPath(): string {
  return join(environment.supportPath, "models", "ggml-base.bin");
}

export function newSessionDirectory(): string {
  ensureSupportDirectories();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const path = join(environment.supportPath, "sessions", stamp);
  mkdirSync(path, { recursive: true });
  mkdirSync(join(path, "frames"), { recursive: true });
  mkdirSync(join(path, "automatic"), { recursive: true });
  return path;
}
