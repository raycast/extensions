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
  if (code === "no_selection") return { title: "Select a PDF first", message, paused: false };
  if (code === "too_many") return { title: "Too many files selected", message, paused: false };
  if (code === "no_text") return { title: "Select some text first", message, paused: false };
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
    try {
      const r = await client.run("compress", [src], { level });
      const first = r.files[0];
      if (!first) throw new Error("KovaPDF returned no file.");
      const data = await first.bytes();
      const out = outputPath(src, "compressed", disk.exists);
      await disk.write(out, data);
      saved.push({ path: out, bytes: data.length });
    } catch (err) {
      // Keep what is already saved on the error, so the command can say which PDFs are done.
      if (!saved.length) throw err;
      const e = err instanceof Error ? err : new Error(String(err));
      throw Object.assign(e, { saved: [...saved], failedFile: src, total: pdfs.length });
    }
  }
  return saved;
}

/** When compressing stopped part way: what was saved and which PDF failed. Undefined otherwise. */
export function partialCompress(err: unknown): { title: string; message: string; firstSaved: string } | undefined {
  const e = (err ?? {}) as { saved?: unknown; failedFile?: unknown; total?: unknown };
  if (!Array.isArray(e.saved) || !e.saved.length || typeof e.failedFile !== "string") return undefined;
  const saved = e.saved as Saved[];
  const total = typeof e.total === "number" ? e.total : saved.length + 1;
  const reason = friendlyError(err).message;
  return {
    title: `Compressed ${saved.length} of ${total}`,
    message: `${path.basename(e.failedFile)} could not be compressed: ${reason} The others before it are saved next to their originals.`,
    firstSaved: saved[0]!.path,
  };
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
  if (!text.trim()) throw Object.assign(new Error("Select some Bijoy text first."), { code: "no_text" });
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
const VERDICT: Record<string, string> = {
  UNCHANGED: "Not changed since it was signed",
  ALLOWED_CHANGES: "Changed after signing, only in ways the signature allows",
  CHANGED: "Changed after it was signed",
  REVOKED: "Signed, but the signer's certificate has been revoked",
  BROKEN: "The signature does not match the document",
};
const TRUST: Record<string, string> = {
  TRUSTED: "Trusted",
  NOT_TRUSTED: "Not issued by a trusted certificate authority",
  UNKNOWN: "Could not be checked",
};
const TRUSTED_BY: Record<string, string> = {
  system: "system roots",
  eutl: "EU trusted lists",
  aatl: "Adobe AATL",
  custom: "your certificate",
};

/** "19 Nov 2026, 04:00 UTC", or the text as it came when it is not a date. */
function when(v: unknown): string {
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return String(v);
  const m = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getUTCMonth()];
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${d.getUTCDate()} ${m} ${d.getUTCFullYear()}, ${hh}:${mm} UTC`;
}

/** The KovaPDF verify report as Markdown. Every value from the file is shown as code, never as Markdown. */
export function verifyMarkdown(fileName: string, report: Record<string, unknown>): string {
  const code = (v: unknown) =>
    "`" +
    String(v ?? "")
      .replace(/`/g, "'")
      .replace(/\s+/g, " ")
      .slice(0, 200) +
    "`";
  const obj = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});
  const sigs = Array.isArray(report.signatures) ? (report.signatures as Record<string, unknown>[]) : [];
  const lines = [`# ${code(fileName)}`, ""];
  if (!sigs.length) lines.push("No digital signatures were found in this PDF.");
  else {
    lines.push(`${sigs.length} signature${sigs.length === 1 ? "" : "s"} found.`, "");
    sigs.forEach((s, i) => {
      const cert = obj(s.certificateDetails);
      const status = obj(s.status);
      const ts = obj(s.timestamp);
      const who = cert.commonName || cert.organization || cert.email || s.signerName || s.signer || s.name;
      lines.push(`## Signature ${i + 1}`, "");
      lines.push(`- **Signer:** ${who ? code(who) : "Not named in the certificate"}`);
      const verdict = typeof s.verdict === "string" ? VERDICT[s.verdict] : undefined;
      if (verdict) lines.push(`- **Document:** ${verdict}`);
      else if (typeof s.status === "string") lines.push(`- **Result:** ${code(s.status)}`);
      if (typeof status.signature === "string")
        lines.push(`- **Signature:** ${status.signature === "VALID" ? "Valid" : "Not valid"}`);
      if (typeof status.trust === "string") {
        const by = Array.isArray(status.trustedBy)
          ? status.trustedBy.map((t) => TRUSTED_BY[String(t)] ?? String(t))
          : [];
        lines.push(
          `- **Certificate:** ${TRUST[status.trust] ?? code(status.trust)}${by.length ? ` (${by.join(", ")})` : ""}`,
        );
      }
      const issuer = cert.issuerCommonName || cert.issuerOrganization;
      if (issuer) lines.push(`- **Issued by:** ${code(issuer)}`);
      const stamped = ts.present && ts.valid && ts.genTime;
      const t = stamped ? ts.genTime : (s.signingTime ?? s.signedAt ?? s.time);
      if (t) lines.push(`- **Signed:** ${when(t)}${stamped ? " (trusted timestamp)" : " (signer's clock)"}`);
      lines.push("");
    });
  }
  lines.push("", `_${ATTRIBUTION.replace("kovapdf.com", `[kovapdf.com](${SITE_URL})`)}_`);
  return lines.join("\n");
}
