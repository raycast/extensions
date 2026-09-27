import { writeFileSync } from "node:fs";
import { newImagePath, type RenderedImage } from "./render";
import type { ChartSource } from "./source";

export const DEFAULT_KROKI_URL = "https://kroki.io";
const TIMEOUT = 20000;

/** Width and height from the PNG header. */
function pngSize(bytes: Buffer): { width: number; height: number } {
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

/** Kroki draws Mermaid only; the ECharts option would need a browser. */
export async function renderWithKroki(
  source: ChartSource,
  baseUrl: string,
  dark: boolean,
  workDir: string,
  signal?: AbortSignal,
): Promise<RenderedImage> {
  if (source.kind !== "mermaid") throw new Error("Kroki draws Mermaid diagrams only.");
  const base = (baseUrl.trim() || DEFAULT_KROKI_URL).replace(/\/+$/, "");
  const text = dark ? `%%{init: {"theme": "dark"}}%%\n${source.text}` : source.text;
  const response = await fetch(`${base}/mermaid/png`, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: text,
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(TIMEOUT)]) : AbortSignal.timeout(TIMEOUT),
  });
  if (!response.ok) {
    const detail = (await response.text()).trim();
    throw new Error(detail || `${base} answered ${response.status}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  const path = newImagePath(workDir);
  writeFileSync(path, bytes);
  return { path, ...pngSize(bytes) };
}
