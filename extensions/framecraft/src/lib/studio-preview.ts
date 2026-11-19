import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { buildExecutionEnv } from "./env";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { renderTransparentTextOverlayPng } from "./macos-native";
import { CaptureProjectManifest, RuntimeConfig } from "./types";

const execute = promisify(execFile);
const pending = new Map<string, Promise<string>>();
const queues = new Map<string, Promise<unknown>>();

function fileRevision(filename: string): string {
  try {
    const stat = fs.statSync(filename);
    return `${filename}:${stat.size}:${stat.mtimeMs}:${stat.ctimeMs}`;
  } catch {
    return `${filename}:missing`;
  }
}

export function studioPreviewRevision(manifest: CaptureProjectManifest): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        background: fileRevision(manifest.cleanPngPath),
        colorInfo: manifest.colorInfo,
        cinemaBar: manifest.cinemaBar,
        alignTop: manifest.alignTop,
        layers: manifest.layers.map((layer) => ({
          ...layer,
          bitmapRevision: layer.bitmapFilename
            ? fileRevision(path.join(manifest.projectDir, layer.bitmapFilename))
            : undefined,
        })),
      }),
    )
    .digest("hex")
    .slice(0, 20);
}

// Serialize per project so rapid edits never launch overlapping ffmpeg renders.
export async function createStudioPreview(manifest: CaptureProjectManifest, config: RuntimeConfig): Promise<string> {
  const filename = path.join(manifest.projectDir, `_studio_preview_${studioPreviewRevision(manifest)}.jpg`);
  const existing = pending.get(filename);
  if (existing) return existing;
  const previous = queues.get(manifest.projectDir) ?? Promise.resolve();
  const operation = previous
    .catch(() => undefined)
    .then(async () => {
      if (fs.existsSync(filename)) return filename;
      const { width, height } = manifest.colorInfo;
      const scale = Math.min(1, 480 / width);
      const previewWidth = Math.max(1, Math.round(width * scale));
      const previewHeight = Math.max(1, Math.round(height * scale));
      const barPad = manifest.cinemaBar ? Math.round(height * 0.12) : 0;
      const previewPad = Math.round(barPad * scale);
      const totalHeight = previewHeight + previewPad * 2;
      const textFile = filename + ".text.png";
      try {
        const args = ["-hide_banner", "-loglevel", "error", "-y", "-threads", "1", "-i", manifest.cleanPngPath];
        const filters = [
          `[0:v]scale=${previewWidth}:${previewHeight},format=rgba,pad=${previewWidth}:${totalHeight}:0:${previewPad}:black[base0]`,
        ];
        let count = 0;
        for (const layer of manifest.layers) {
          if (!layer.visible || layer.kind !== "bitmap" || !layer.bitmapFilename) continue;
          const bitmap = path.join(manifest.projectDir, layer.bitmapFilename);
          if (!fs.existsSync(bitmap)) throw new Error("The subtitle bitmap no longer exists. Capture the frame again.");
          args.push("-threads", "1", "-i", bitmap);
          const input = count + 1;
          const y = Math.round((barPad + (manifest.alignTop ? -Math.round(height * 0.72) : 0) + layer.yOffset) * scale);
          filters.push(`[${input}:v]scale=${previewWidth}:${previewHeight},format=rgba[layer${input}]`);
          filters.push(`[base${count}][layer${input}]overlay=0:${y}:format=auto[base${input}]`);
          count++;
        }
        const texts = manifest.layers.filter(
          (layer) => layer.visible && layer.kind === "text" && (layer.text ?? "").trim(),
        );
        if (texts.length) {
          const rendered = await renderTransparentTextOverlayPng(
            config.supportPath,
            previewWidth,
            totalHeight,
            texts.map((layer) => ({
              text: layer.text ?? "",
              fontFamily: layer.fontFamily || "PingFang SC",
              fontSize: (layer.fontSize ?? Math.max(28, Math.round(height * 0.044))) * scale,
              fillHex: layer.fillColor || "#FFFFFF",
              strokeHex: layer.strokeColor || "#000000",
              yOffset: layer.yOffset * scale,
              alignTop: manifest.alignTop,
            })),
            textFile,
          );
          if (!rendered) throw new Error("Couldn't generate the text preview.");
          args.push("-i", textFile);
          filters.push(`[base${count}][${count + 1}:v]overlay=0:0:format=auto[base${count + 1}]`);
          count++;
        }
        filters.push(`[base${count}]format=yuvj444p[out]`);
        args.push(
          "-filter_complex_threads",
          "1",
          "-filter_complex",
          filters.join(";"),
          "-map",
          "[out]",
          "-frames:v",
          "1",
          "-threads",
          "1",
          "-q:v",
          "3",
          filename,
        );
        await execute(config.ffmpegPath, args, { env: buildExecutionEnv(config.bypassProxy), timeout: 30_000 });
        const cached = fs
          .readdirSync(manifest.projectDir)
          .filter((name) => /^_studio_preview_[a-f0-9]{20}\.jpg$/.test(name))
          .map((name) => ({ name, time: fs.statSync(path.join(manifest.projectDir, name)).mtimeMs }))
          .sort((a, b) => b.time - a.time);
        for (const stale of cached.slice(3)) fs.rmSync(path.join(manifest.projectDir, stale.name), { force: true });
        return filename;
      } catch (error) {
        fs.rmSync(filename, { force: true });
        throw error;
      } finally {
        fs.rmSync(textFile, { force: true });
      }
    });
  pending.set(filename, operation);
  queues.set(manifest.projectDir, operation);
  try {
    return await operation;
  } finally {
    pending.delete(filename);
    if (queues.get(manifest.projectDir) === operation) queues.delete(manifest.projectDir);
  }
}
