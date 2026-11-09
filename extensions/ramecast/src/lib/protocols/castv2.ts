import { environment } from "@raycast/api";
import { createRequire } from "module";
import path from "path";

// The Cast client lives in assets/castv2.js so the detached mirroring worker can use the same code.
// This file only gives it types.

type Json = Record<string, unknown>;

export interface CastClient {
  connect(host: string, port?: number, timeoutMs?: number): Promise<void>;
  close(): void;
  getStatus(): Promise<{ applications?: { appId: string; sessionId: string; transportId: string }[] }>;
  loadMedia(media: { contentId: string; contentType: string; streamType: "LIVE" | "BUFFERED" }): Promise<void>;
  stopApps(): Promise<void>;
}

interface CastModule {
  CastClient: new (log?: (line: string) => void) => CastClient;
  encode(destination: string, namespace: string, data: Json): Buffer;
  decode(buf: Buffer): { source: string; destination: string; namespace: string; data: Json };
}

let mod: CastModule | undefined;
export function castv2(): CastModule {
  mod ??= createRequire(__filename)(path.join(environment.assetsPath, "castv2.js")) as CastModule;
  return mod;
}
