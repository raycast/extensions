import { readFileSync, writeFileSync } from "fs";
import { basename, dirname, join, extname } from "path";
import { categoryFor, endpointPath, extOf } from "./categories";

const BASE = "https://micompress.com";
const UA = "micompress-raycast/1.0.0 (+https://micompress.com)";
export const SITE = `${BASE}/?utm_source=raycast&utm_medium=extension&utm_campaign=extend`;

export interface Meta {
  inputSize: number;
  outputSize: number;
  savedBytes: number;
  savedPercent: number;
  format: string;
}

export async function compressFile(input: string, preset: string): Promise<{ dest: string; meta: Meta }> {
  const filename = basename(input);
  const category = categoryFor(filename);
  if (!category) throw new Error(`Unsupported file type ".${extOf(filename) || "?"}"`);

  const bytes = readFileSync(input);
  const form = new FormData();
  form.append("file", new Blob([bytes]), filename);
  form.append("preset", preset);

  const res = await fetch(`${BASE}/${endpointPath(category)}/compress`, {
    method: "POST",
    body: form,
    headers: { Accept: "application/json", "User-Agent": UA },
  });
  const json = (await res.json()) as Meta & { success?: boolean; error?: string; downloadUrl?: string };
  if (!json.success || !json.downloadUrl) throw new Error(json.error || `HTTP ${res.status}`);

  const dl = await fetch(BASE + json.downloadUrl, { headers: { "User-Agent": UA } });
  if (!dl.ok) throw new Error("Download failed");
  const buf = Buffer.from(await dl.arrayBuffer());

  const ext = extname(filename);
  const dest = join(dirname(input), `${basename(filename, ext)}-min${ext}`);
  writeFileSync(dest, buf);
  return { dest, meta: json };
}
