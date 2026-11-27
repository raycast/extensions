import { requireApiKey } from "../api-key";
import { codeName, type DynamicCode, listCodes } from "../qrdx-api";

interface Input {
  /** Optional words to search the codes' titles, destinations, notes and tags, or a short link to find one code. */
  query?: string;
}

/** One line per code, with the id the other tools take. */
export function codeLine(code: DynamicCode): string {
  const opens = code.kind === "page" ? "a hosted page" : (code.destinationUrl ?? "nothing");
  const lastScan = code.lastScannedAt ? `, last scanned ${code.lastScannedAt.slice(0, 10)}` : "";
  return `**${codeName(code)}** (id ${code.id}) · ${code.shortLink} → ${opens} · ${code.scanCount} scans${lastScan}`;
}

/**
 * List the dynamic QR codes in the user's QRdx workspace (newest first, up to
 * 100), with each code's id, short link, destination and scan count.
 */
export default async function listDynamicCodes(input: Input): Promise<string> {
  const { codes, total } = await listCodes(requireApiKey(), input.query);
  if (codes.length === 0) {
    return input.query?.trim()
      ? `No dynamic QR codes match "${input.query}".`
      : "This QRdx workspace has no dynamic QR codes yet.";
  }
  const shown = total > codes.length ? `${codes.length} of ${total}` : String(codes.length);
  return `Found ${shown} dynamic QR code${total === 1 ? "" : "s"}:\n\n${codes.map(codeLine).join("\n")}`;
}
