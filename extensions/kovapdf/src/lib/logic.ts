/**
 * Everything the commands do, without Raycast: so it can be tested with the
 * SDK replaced. The commands (src/*.tsx) only collect the selection, show
 * toasts and hand over to these functions.
 */
import path from "node:path";

export const EXTENSION_VERSION = "1.0.0";
export const ATTRIBUTION = "Done with KovaPDF (kovapdf.com).";
export const SITE_URL = "https://www.kovapdf.com";

/** The part of the SDK client the commands use. */
export interface RunResultLike {
  files: { name: string; bytes(): Promise<Uint8Array> }[];
  report: Record<string, unknown> | null;
  text?: string;
  attribution: string;
}
export interface ClientLike {
  run(
    tool: string,
    inputs: unknown[],
    options?: Record<string, unknown>,
    runOptions?: { timeoutMs?: number },
  ): Promise<RunResultLike>;
  verify(file: string): Promise<Record<string, unknown>>;
}

/** What a command needs from the disk (replaced in tests). */
export interface Disk {
  exists(p: string): boolean;
  write(p: string, data: Uint8Array): Promise<void>;
}

export interface Friendly {
  title: string;
  message: string;
  /** KovaPDF paused this on purpose: say so plainly, do not suggest retrying at once. */
  paused: boolean;
}

/** An error, in words for a person. Never throws. */
export function friendlyError(err: unknown): Friendly {
  const e = (err ?? {}) as { code?: unknown; message?: unknown; retryAfter?: unknown };
  const code = typeof e.code === "string" ? e.code : "";
  const message = typeof e.message === "string" && e.message ? e.message : "Something went wrong. Please try again.";
  if (code === "integration_paused") return { title: "KovaPDF is paused for Raycast", message, paused: true };
  if (code === "tool_paused") return { title: "This tool is paused for apps", message, paused: true };
  if (code === "not_available") return { title: "Not available yet", message, paused: false };
  if (
    code === "missing_api_key" ||
    code === "invalid_api_key" ||
    code === "unknown_api_key" ||
    code === "expired_api_key" ||
    code === "revoked_api_key"
  )
    return { title: "Check your API key", message: `${message} Set it in the extension's preferences.`, paused: false };
  if (code === "insufficient_scope") return { title: "This key needs another permission", message, paused: false };
  const wait = typeof e.retryAfter === "number" && e.retryAfter > 0 ? ` Try again in ${e.retryAfter} seconds.` : "";
  return { title: "KovaPDF could not finish", message: message + wait, paused: false };
}

export const isPdf = (p: string) => /\.pdf$/i.test(p);

/** The PDFs among selected Finder items. */
export function pdfsOnly(paths: string[]): string[] {
  return paths.filter(isPdf);
}

/** Names in the order people expect: a2 before a10. */
export function byName(paths: string[]): string[] {
  return [...paths].sort((a, b) =>
    path.basename(a).localeCompare(path.basename(b), undefined, { numeric: true, sensitivity: "base" }),
  );
}

/** "report.pdf" + "compressed" -> "report-compressed.pdf", or "report-compressed 2.pdf" when taken. Never overwrites. */
export function outputPath(input: string, word: string, exists: (p: string) => boolean, ext = ".pdf"): string {
  const dir = path.dirname(input);
  const stem = path.basename(input).replace(/\.[^.]+$/, "");
  let candidate = path.join(dir, `${stem}-${word}${ext}`);
  for (let n = 2; exists(candidate); n++) candidate = path.join(dir, `${stem}-${word} ${n}${ext}`);
  return candidate;
}

const fmt = (n: number) =>
  n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;

export interface Saved {
  path: string;
  bytes: number;
}

/** Compresses each PDF and saves the smaller copy next to it. */
export async function compressFiles(
  client: ClientLike,
  disk: Disk,
  files: string[],
  level: string,
  onProgress?: (i: number, n: number) => void,
): Promise<Saved[]> {
  const pdfs = pdfsOnly(files);
  if (!pdfs.length)
    throw Object.assign(new Error("Select one or more PDF files in Finder first."), { code: "no_selection" });
  const saved: Saved[] = [];
  for (let i = 0; i < pdfs.length; i++) {
    onProgress?.(i, pdfs.length);
    const src = pdfs[i]!;
    const r = await client.run("compress", [src], { level });
    const first = r.files[0];
    if (!first) throw new Error("KovaPDF returned no file.");
    const data = await first.bytes();
    const out = outputPath(src, "compressed", disk.exists);
    await disk.write(out, data);
    saved.push({ path: out, bytes: data.length });
  }
  return saved;
}

export function compressSummary(saved: Saved[]): string {
  if (saved.length === 1) return `Saved ${path.basename(saved[0]!.path)} (${fmt(saved[0]!.bytes)}). ${ATTRIBUTION}`;
  return `Saved ${saved.length} smaller PDFs next to the originals. ${ATTRIBUTION}`;
}

/** Merges the PDFs in name order and saves the result next to the first. */
export async function mergeFiles(client: ClientLike, disk: Disk, files: string[]): Promise<Saved> {
  const pdfs = byName(pdfsOnly(files));
  if (pdfs.length < 2)
    throw Object.assign(new Error("Select two or more PDF files in Finder first."), { code: "no_selection" });
  if (pdfs.length > 20) throw Object.assign(new Error("KovaPDF merges up to 20 PDFs at a time."), { code: "too_many" });
  const r = await client.run("merge", pdfs, {}, { timeoutMs: 10 * 60_000 });
  const first = r.files[0];
  if (!first) throw new Error("KovaPDF returned no file.");
  const data = await first.bytes();
  const out = outputPath(pdfs[0]!, "merged", disk.exists);
  await disk.write(out, data);
  return { path: out, bytes: data.length };
}

/** Converts Bijoy text to Unicode Bangla through the API job bijoy_to_unicode. */
export async function bijoyToUnicode(client: ClientLike, text: string): Promise<string> {
  if (!text.trim()) throw Object.assign(new Error("Select some Bijoy text first."), { code: "no_selection" });
  const r = await client.run("bijoy_to_unicode", [], { text });
  if (typeof r.text === "string") {
    // A very long text comes back cut short in the report; the whole text is in the file.
    if (/\[The full text is in converted\.txt\]$/.test(r.text) && r.files[0])
      return Buffer.from(await r.files[0].bytes()).toString("utf8");
    return r.text;
  }
  if (r.files[0]) return Buffer.from(await r.files[0].bytes()).toString("utf8");
  throw new Error("KovaPDF returned no text.");
}

/** The verify report as Markdown for a Detail view. Text from the file is shown as data, in code spans. */
export function verifyMarkdown(fileName: string, report: Record<string, unknown>): string {
  const code = (v: unknown) =>
    "`" +
    String(v ?? "")
      .replace(/`/g, "'")
      .replace(/\s+/g, " ")
      .slice(0, 200) +
    "`";
  const sigs = Array.isArray(report.signatures) ? (report.signatures as Record<string, unknown>[]) : [];
  const lines = [`# ${code(fileName)}`, ""];
  if (!sigs.length) lines.push("No digital signatures were found in this PDF.");
  else {
    lines.push(`${sigs.length} signature${sigs.length === 1 ? "" : "s"} found.`, "");
    sigs.forEach((s, i) => {
      const who = s.signerName ?? s.signer ?? s.name ?? "Unknown signer";
      const status = s.status ?? s.verdict ?? s.summary;
      const when = s.signedAt ?? s.signingTime ?? s.time;
      lines.push(`## Signature ${i + 1}`, "", `- Signer: ${code(who)}`);
      if (status !== undefined)
        lines.push(`- Result: ${code(typeof status === "string" ? status : JSON.stringify(status))}`);
      if (when !== undefined) lines.push(`- Signed: ${code(when)}`);
      lines.push("");
    });
  }
  lines.push("", `_${ATTRIBUTION} [kovapdf.com](${SITE_URL})_`);
  return lines.join("\n");
}
