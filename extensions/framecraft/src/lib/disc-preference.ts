import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { PlaybackProbeResult, RuntimeConfig } from "./types";

function filename(config: RuntimeConfig, probe: PlaybackProbeResult): string {
  const source = probe.itemId
    ? `${config.jellyfinUrl}|${probe.itemId}|${probe.mediaSourceId || ""}`
    : probe.mediaTarget;
  const key = createHash("sha256").update(source).digest("hex");
  const dir = path.join(config.supportPath, "disc-choices");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${key}.json`);
}
export function rememberedPlaylist(config: RuntimeConfig, probe: PlaybackProbeResult): number | undefined {
  try {
    const value = JSON.parse(fs.readFileSync(filename(config, probe), "utf8")).playlist;
    return Number.isInteger(value) && value >= 0 && value <= 99999 ? value : undefined;
  } catch {
    return undefined;
  }
}
export function rememberPlaylist(config: RuntimeConfig, probe: PlaybackProbeResult, playlist: number): void {
  const file = filename(config, probe),
    temp = `${file}.${randomUUID()}.tmp`;
  fs.writeFileSync(temp, JSON.stringify({ playlist }), { mode: 0o600 });
  fs.renameSync(temp, file);
}
