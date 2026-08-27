/**
 * Judged on pixel width, never byte size. A flat single-colour favicon compresses to a few hundred bytes
 * at 230×230 while a detailed 32×32 one takes more, so a byte-size floor rejects the good icon and keeps
 * the useless one. Anything under 32px renders as a smudge next to Raycast's own icons.
 */
const MINIMUM_ICON_WIDTH = 32;

const PNG_IHDR_OFFSET = 12;

const readPngWidth = (buffer: Buffer) => {
  if (buffer.length < 24) return 0;
  if (buffer.toString("ascii", PNG_IHDR_OFFSET, PNG_IHDR_OFFSET + 4) !== "IHDR") return 0;

  return buffer.readUInt32BE(PNG_IHDR_OFFSET + 4);
};

export const fetchFavicon = async (domain: string): Promise<Buffer | undefined> => {
  try {
    const response = await fetch(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=256`);
    if (!response.ok) return undefined;

    const buffer = Buffer.from(await response.arrayBuffer());

    return readPngWidth(buffer) >= MINIMUM_ICON_WIDTH ? buffer : undefined;
  } catch {
    return undefined;
  }
};
