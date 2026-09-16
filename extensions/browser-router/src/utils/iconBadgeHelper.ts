import os from "os";
import fs from "fs";
import path from "path";
import zlib from "zlib";
import { environment } from "@raycast/api";

function makeChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  const toCrc = Buffer.concat([typeBuf, data]);
  let c = 0xffffffff;
  for (let i = 0; i < toCrc.length; i++) {
    c = c ^ toCrc[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  c = (c ^ 0xffffffff) >>> 0;
  crcBuf.writeUInt32BE(c, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function unfilterPng(raw: Buffer, w: number, h: number, bytesPerPixel: number): Buffer {
  const stride = w * bytesPerPixel;
  const out = Buffer.alloc(stride * h);
  let srcPos = 0;
  for (let y = 0; y < h; y++) {
    const filter = raw[srcPos++];
    const currRow = y * stride;
    const prevRow = (y - 1) * stride;
    for (let x = 0; x < stride; x++) {
      const byte = raw[srcPos++];
      const left = x >= bytesPerPixel ? out[currRow + x - bytesPerPixel] : 0;
      const up = y > 0 ? out[prevRow + x] : 0;
      const upLeft = y > 0 && x >= bytesPerPixel ? out[prevRow + x - bytesPerPixel] : 0;
      let val = 0;
      switch (filter) {
        case 0:
          val = byte;
          break;
        case 1:
          val = (byte + left) & 0xff;
          break;
        case 2:
          val = (byte + up) & 0xff;
          break;
        case 3:
          val = (byte + Math.floor((left + up) / 2)) & 0xff;
          break;
        case 4:
          val = (byte + paeth(left, up, upLeft)) & 0xff;
          break;
        default:
          val = byte;
      }
      out[currRow + x] = val;
    }
  }
  return out;
}

function decodePng(buf: Buffer): { w: number; h: number; pixels: Buffer } | null {
  if (!buf || buf.length < 29) return null;
  // PNG signature
  if (buf.readUInt32BE(0) !== 0x89504e47 || buf.readUInt32BE(4) !== 0x0d0a1a0a) {
    return null;
  }
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  const bitDepth = buf.readUInt8(24);
  const colorType = buf.readUInt8(25);
  const compressionMethod = buf.readUInt8(26);
  const filterMethod = buf.readUInt8(27);
  const interlaceMethod = buf.readUInt8(28);

  // Validate standard non-interlaced 8-bit truecolor RGB (2) or RGBA (6)
  if (bitDepth !== 8 || compressionMethod !== 0 || filterMethod !== 0 || interlaceMethod !== 0) {
    return null;
  }
  if (colorType !== 2 && colorType !== 6) {
    return null;
  }

  let pos = 8;
  const idatList: Buffer[] = [];
  while (pos < buf.length) {
    if (pos + 8 > buf.length) break;
    const len = buf.readUInt32BE(pos);
    const type = buf.slice(pos + 4, pos + 8).toString("ascii");
    if (type === "IDAT") {
      idatList.push(buf.slice(pos + 8, pos + 8 + len));
    }
    pos += 8 + len + 4;
  }
  if (idatList.length === 0) return null;

  try {
    const raw = zlib.inflateSync(Buffer.concat(idatList));
    if (colorType === 2) {
      const rgb = unfilterPng(raw, w, h, 3);
      const rgba = Buffer.alloc(w * h * 4);
      for (let i = 0; i < w * h; i++) {
        rgba[i * 4] = rgb[i * 3];
        rgba[i * 4 + 1] = rgb[i * 3 + 1];
        rgba[i * 4 + 2] = rgb[i * 3 + 2];
        rgba[i * 4 + 3] = 255;
      }
      return { w, h, pixels: rgba };
    } else {
      const rgba = unfilterPng(raw, w, h, 4);
      return { w, h, pixels: rgba };
    }
  } catch {
    return null;
  }
}

function encodePng(w: number, h: number, pixels: Buffer): Buffer {
  const stride = 1 + w * 4;
  const raw = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) {
    const rowOffset = y * stride;
    raw[rowOffset] = 0;
    for (let x = 0; x < w; x++) {
      const srcIdx = (y * w + x) * 4;
      const dstIdx = rowOffset + 1 + x * 4;
      raw[dstIdx] = pixels[srcIdx];
      raw[dstIdx + 1] = pixels[srcIdx + 1];
      raw[dstIdx + 2] = pixels[srcIdx + 2];
      raw[dstIdx + 3] = pixels[srcIdx + 3];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const idat = zlib.deflateSync(raw);
  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([header, makeChunk("IHDR", ihdr), makeChunk("IDAT", idat), makeChunk("IEND", Buffer.alloc(0))]);
}

function resizeRgba(src: Buffer, sw: number, sh: number, dw: number, dh: number): Buffer {
  const dst = Buffer.alloc(dw * dh * 4);
  for (let dy = 0; dy < dh; dy++) {
    const sy = (dy * sh) / dh;
    const y0 = Math.floor(sy);
    const y1 = Math.min(y0 + 1, sh - 1);
    const yf = sy - y0;
    for (let dx = 0; dx < dw; dx++) {
      const sx = (dx * sw) / dw;
      const x0 = Math.floor(sx);
      const x1 = Math.min(x0 + 1, sw - 1);
      const xf = sx - x0;
      const idx00 = (y0 * sw + x0) * 4;
      const idx10 = (y0 * sw + x1) * 4;
      const idx01 = (y1 * sw + x0) * 4;
      const idx11 = (y1 * sw + x1) * 4;
      const dIdx = (dy * dw + dx) * 4;
      for (let c = 0; c < 4; c++) {
        const top = src[idx00 + c] * (1 - xf) + src[idx10 + c] * xf;
        const bot = src[idx01 + c] * (1 - xf) + src[idx11 + c] * xf;
        dst[dIdx + c] = Math.round(top * (1 - yf) + bot * yf);
      }
    }
  }
  return dst;
}

function blendPixel(dst: Buffer, dIdx: number, r: number, g: number, b: number, a: number): void {
  if (a <= 0) return;
  const srcA = a / 255;
  const dstA = dst[dIdx + 3] / 255;
  const outA = srcA + dstA * (1 - srcA);
  if (outA <= 0) return;
  dst[dIdx] = Math.round((r * srcA + dst[dIdx] * dstA * (1 - srcA)) / outA);
  dst[dIdx + 1] = Math.round((g * srcA + dst[dIdx + 1] * dstA * (1 - srcA)) / outA);
  dst[dIdx + 2] = Math.round((b * srcA + dst[dIdx + 2] * dstA * (1 - srcA)) / outA);
  dst[dIdx + 3] = Math.round(outA * 255);
}

// User Request:
// "remove the background instead fill the space by increasing the size of badge icon"
function compositeAvatarMainWithDirectBadge(avatarPngBuf: Buffer, browserPngBuf: Buffer): Buffer | null {
  const canvas = Buffer.alloc(256 * 256 * 4);

  const av = decodePng(avatarPngBuf);
  const browserLogo = decodePng(browserPngBuf);
  if (!av || !browserLogo) return null;
  const mainCx = 116;
  const mainCy = 140;
  const mainRadius = 120;
  const avDrawSize = mainRadius * 2;
  const scaledAv = resizeRgba(av.pixels, av.w, av.h, avDrawSize, avDrawSize);
  const avStartX = mainCx - mainRadius;
  const avStartY = mainCy - mainRadius;

  for (let ay = 0; ay < avDrawSize; ay++) {
    const targetY = avStartY + ay;
    if (targetY < 0 || targetY >= 256) continue;
    for (let ax = 0; ax < avDrawSize; ax++) {
      const targetX = avStartX + ax;
      if (targetX < 0 || targetX >= 256) continue;
      const distCenter = Math.hypot(ax - mainRadius, ay - mainRadius);
      if (distCenter > mainRadius) continue;
      const aa = Math.min(1, Math.max(0, mainRadius - distCenter + 0.5));

      const sIdx = (ay * avDrawSize + ax) * 4;
      const dIdx = (targetY * 256 + targetX) * 4;
      const a = Math.round(scaledAv[sIdx + 3] * aa);
      if (a > 0) {
        blendPixel(canvas, dIdx, scaledAv[sIdx], scaledAv[sIdx + 1], scaledAv[sIdx + 2], a);
      }
    }
  }

  // 2. Draw Browser Logo as the Badge at top-right with NO background
  // Enlarged to fill the space: diameter 136px (radius 68px) centered at (186, 68)
  const badgeCx = 186;
  const badgeCy = 68;
  const logoRadius = 68;
  const logoDrawSize = logoRadius * 2;

  const scaledLogo = resizeRgba(browserLogo.pixels, browserLogo.w, browserLogo.h, logoDrawSize, logoDrawSize);
  const logoStartX = badgeCx - logoRadius;
  const logoStartY = badgeCy - logoRadius;

  // Step A: Elevation shadow directly under the non-transparent logo pixels for clean floating 3D separation
  const shadowOffsetY = 4;
  const shadowSpread = 6;
  for (let ly = 0; ly < logoDrawSize; ly++) {
    for (let lx = 0; lx < logoDrawSize; lx++) {
      const sIdx = (ly * logoDrawSize + lx) * 4;
      const logoAlpha = scaledLogo[sIdx + 3];
      if (logoAlpha > 20) {
        const targetX = logoStartX + lx;
        const targetY = logoStartY + ly + shadowOffsetY;
        for (let sy = -shadowSpread; sy <= shadowSpread; sy += 2) {
          const dy = targetY + sy;
          if (dy < 0 || dy >= 256) continue;
          for (let sx = -shadowSpread; sx <= shadowSpread; sx += 2) {
            const dx = targetX + sx;
            if (dx < 0 || dx >= 256) continue;
            const dist = Math.hypot(sx, sy);
            if (dist <= shadowSpread) {
              const dIdx = (dy * 256 + dx) * 4;
              const shadowAlpha = (1 - dist / shadowSpread) * (logoAlpha / 255) * 0.3;
              blendPixel(canvas, dIdx, 0, 0, 0, Math.round(shadowAlpha * 255));
            }
          }
        }
      }
    }
  }

  // Step B: Draw the enlarged browser logo directly (zero background plate)
  for (let ly = 0; ly < logoDrawSize; ly++) {
    const targetY = logoStartY + ly;
    if (targetY < 0 || targetY >= 256) continue;
    for (let lx = 0; lx < logoDrawSize; lx++) {
      const targetX = logoStartX + lx;
      if (targetX < 0 || targetX >= 256) continue;
      const sIdx = (ly * logoDrawSize + lx) * 4;
      const a = scaledLogo[sIdx + 3];
      if (a > 0) {
        const dIdx = (targetY * 256 + targetX) * 4;
        blendPixel(canvas, dIdx, scaledLogo[sIdx], scaledLogo[sIdx + 1], scaledLogo[sIdx + 2], a);
      }
    }
  }

  return encodePng(256, 256, canvas);
}

export function getAssetsDir(): string {
  const home = os.homedir();
  const candidates = [
    path.join(__dirname, "assets"),
    path.join(__dirname, "..", "assets"),
    path.join(__dirname, "..", "..", "assets"),
    path.join(home, ".config", "raycast", "extensions", "browser-router", "assets"),
    path.join(home, ".config", "raycast-x", "extensions", "browser-router", "assets"),
    path.join(home, "AppData", "Local", "Raycast", "extensions", "browser-router", "assets"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return path.join(home, ".config", "raycast", "extensions", "browser-router", "assets");
}

export function ensureAvatarBadgedIcon(
  browserId: string,
  safeProfileId: string,
  diskAvatarPath?: string,
): string | undefined {
  if (!diskAvatarPath || !fs.existsSync(diskAvatarPath)) {
    return undefined;
  }

  try {
    const assetsDir = getAssetsDir();
    const supportDir = environment.supportPath;
    const profilesDir = path.join(supportDir, "profiles");
    if (!fs.existsSync(profilesDir)) {
      fs.mkdirSync(profilesDir, { recursive: true });
    }

    const badgedFile = path.join(profilesDir, `nobg_${safeProfileId}.png`);
    const avatarStat = fs.statSync(diskAvatarPath);

    if (fs.existsSync(badgedFile)) {
      const badgedStat = fs.statSync(badgedFile);
      if (badgedStat.mtimeMs >= avatarStat.mtimeMs) {
        return badgedFile;
      }
    }

    // Find browser logo to composite with
    const browserLogoPath = path.join(assetsDir, "extracted", `${browserId}.png`);
    if (!fs.existsSync(browserLogoPath)) {
      return undefined;
    }

    const browserLogoBuf = fs.readFileSync(browserLogoPath);
    const avatarBuf = fs.readFileSync(diskAvatarPath);
    const composited = compositeAvatarMainWithDirectBadge(avatarBuf, browserLogoBuf);
    if (!composited) {
      return undefined;
    }

    fs.writeFileSync(badgedFile, composited);
    return badgedFile;
  } catch (err) {
    console.error(`Failed to generate badged icon for ${safeProfileId}:`, err);
    return undefined;
  }
}
