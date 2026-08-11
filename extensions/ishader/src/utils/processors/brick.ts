import fs from "fs";
import path from "path";
import { environment } from "@raycast/api";
import { Jimp, intToRGBA, rgbaToInt } from "jimp";
import { saturate, hueShift, applyBlur, grainNoise } from "./common";

export interface BrickParams {
  showEffect: boolean;
  blur: number;
  grain: number;
  gamma: number;
  blackPoint: number;
  whitePoint: number;
  gridRows: number; // [10-200]
  gridGap: number; // [0-20]
  squareOpacity: number; // [0-100]
  squareBorder: number; // [0-10]
  squareRadius: number; // [0-50]
  circleOpacity: number; // [0-100]
  circleSize: number; // [0-1]
  circleBorder: number; // [0-10]
  exposure: number; // [0.1-2.0]
  hue: number; // [-180-180]
  lightAngle: number; // [0-360]
}

/**
 * Processes an image using brick effect
 */
export async function processImageWithBrick(
  inputImagePath: string,
  params: BrickParams,
  outputPath?: string,
): Promise<string> {
  const image = await Jimp.read(inputImagePath);
  const width = image.width;
  const height = image.height;

  if (params.blur > 0) {
    await applyBlur(image, params.blur, intToRGBA, rgbaToInt);
  }

  image.scan(0, 0, width, height, function (this: typeof image, x: number, y: number) {
    const color = intToRGBA(this.getPixelColor(x, y));

    let r = color.r / 255.0;
    let g = color.g / 255.0;
    let b = color.b / 255.0;

    r = Math.pow(Math.max(0, r), 1.0 / Math.max(0.001, params.gamma));
    g = Math.pow(Math.max(0, g), 1.0 / Math.max(0.001, params.gamma));
    b = Math.pow(Math.max(0, b), 1.0 / Math.max(0.001, params.gamma));

    const range = Math.max(1.0, params.whitePoint - params.blackPoint);
    r = saturate((r * 255.0 - params.blackPoint) / range);
    g = saturate((g * 255.0 - params.blackPoint) / range);
    b = saturate((b * 255.0 - params.blackPoint) / range);

    if (params.grain > 0) {
      const grainR = (grainNoise(x, y, 0) - 0.5) * params.grain;
      const grainG = (grainNoise(x, y, 1) - 0.5) * params.grain;
      const grainB = (grainNoise(x, y, 2) - 0.5) * params.grain;
      r = saturate(r + grainR);
      g = saturate(g + grainG);
      b = saturate(b + grainB);
    }

    if (!params.showEffect) {
      const finalR = Math.round(r * 255);
      const finalG = Math.round(g * 255);
      const finalB = Math.round(b * 255);
      this.setPixelColor(rgbaToInt(finalR, finalG, finalB, 255), x, y);
      return;
    }

    const gridRows = Math.max(10, Math.min(200, params.gridRows));
    const gridGap = Math.max(0, Math.min(20, params.gridGap));
    const gridUVX = ((x / width) * gridRows) % 1.0;
    const gridUVY = ((y / height) * gridRows) % 1.0;
    const gapThreshold = gridGap / gridRows;

    const cellX = Math.floor((x / width) * gridRows);
    const cellY = Math.floor((y / height) * gridRows);
    const centerPx = Math.min(width - 1, Math.floor(((cellX + 0.5) / gridRows) * width));
    const centerPy = Math.min(height - 1, Math.floor(((cellY + 0.5) / gridRows) * height));

    const centerCol = intToRGBA(this.getPixelColor(centerPx, centerPy));
    let baseR = centerCol.r / 255.0;
    let baseG = centerCol.g / 255.0;
    let baseB = centerCol.b / 255.0;
    baseR = Math.pow(Math.max(0, baseR), 1.0 / Math.max(0.001, params.gamma));
    baseG = Math.pow(Math.max(0, baseG), 1.0 / Math.max(0.001, params.gamma));
    baseB = Math.pow(Math.max(0, baseB), 1.0 / Math.max(0.001, params.gamma));
    const range2 = Math.max(1.0, params.whitePoint - params.blackPoint);
    baseR = saturate((baseR * 255.0 - params.blackPoint) / range2);
    baseG = saturate((baseG * 255.0 - params.blackPoint) / range2);
    baseB = saturate((baseB * 255.0 - params.blackPoint) / range2);

    const gridMask =
      gridGap > 0 ? Math.max(gridUVX <= gapThreshold ? 1.0 : 0.0, gridUVY <= gapThreshold ? 1.0 : 0.0) : 0.0;

    const sz = Math.max(0.0, Math.min(1.0, params.circleSize || 0.3));
    const studRadius = Math.min(0.48, 0.3 + 0.4 * sz);
    const bevel = Math.max(0.0, params.circleBorder / 100.0);

    const dx = (gridUVX - 0.5) / (studRadius + 1e-6);
    const dy = (gridUVY - 0.5) / (studRadius + 1e-6);
    const rr = Math.sqrt(dx * dx + dy * dy);

    const plateR = baseR * 0.88 + 0.12;
    const plateG = baseG * 0.88 + 0.12;
    const plateB = baseB * 0.88 + 0.12;

    let outR = plateR * (1.0 - gridMask * 0.35);
    let outG = plateG * (1.0 - gridMask * 0.35);
    let outB = plateB * (1.0 - gridMask * 0.35);

    if (rr <= 1.0) {
      const rClamp = Math.min(1.0, rr);
      const z = Math.sqrt(Math.max(0.0, 1.0 - rClamp * rClamp));

      const nx = dx;
      const ny = dy;
      const nz = Math.max(0.0, z * (1.0 - bevel * 0.5));
      const nLen = Math.max(1e-6, Math.sqrt(nx * nx + ny * ny + nz * nz));
      const n0x = nx / nLen;
      const n0y = ny / nLen;
      const n0z = nz / nLen;

      const ang = (params.lightAngle * Math.PI) / 180.0;
      const lx = Math.cos(ang);
      const ly = Math.sin(ang);
      const lz = 0.6; // slight overhead light for highlight
      const lLen = Math.max(1e-6, Math.sqrt(lx * lx + ly * ly + lz * lz));
      const l0x = lx / lLen;
      const l0y = ly / lLen;
      const l0z = lz / lLen;

      const vx = 0.0,
        vy = 0.0,
        vz = 1.0;
      const ndotl = n0x * -l0x + n0y * -l0y + n0z * -l0z;
      const rx = -l0x - 2.0 * ndotl * n0x;
      const ry = -l0y - 2.0 * ndotl * n0y;
      const rz = -l0z - 2.0 * ndotl * n0z;
      const rlen = Math.max(1e-6, Math.sqrt(rx * rx + ry * ry + rz * rz));
      const r0x = rx / rlen;
      const r0y = ry / rlen;
      const r0z = rz / rlen;
      const vdotr = Math.max(0.0, r0x * vx + r0y * vy + r0z * vz);
      const specTight = Math.pow(vdotr, 64.0) * 0.85;
      const specBroad = Math.pow(vdotr, 8.0) * 0.2;

      outR = baseR + specTight + specBroad;
      outG = baseG + specTight + specBroad;
      outB = baseB + specTight + specBroad;
      const rim = 1.0 - saturate((rClamp - (1.0 - bevel)) / (bevel + 1e-4));
      const ao = rim * 0.06;
      outR = Math.max(0.0, outR - ao);
      outG = Math.max(0.0, outG - ao);
      outB = Math.max(0.0, outB - ao);
    } else {
      const dEdge = rr - 1.0;
      const shadow = Math.exp(-Math.max(0.0, dEdge) * 12.0) * 0.18;
      outR = Math.max(0.0, outR - shadow);
      outG = Math.max(0.0, outG - shadow);
      outB = Math.max(0.0, outB - shadow);
    }

    const exposure = Math.max(0.1, Math.min(2.0, params.exposure));
    outR *= exposure;
    outG *= exposure;
    outB *= exposure;

    const [finalR, finalG, finalB] = hueShift(saturate(outR), saturate(outG), saturate(outB), params.hue);

    const outRi = Math.round(finalR * 255);
    const outGi = Math.round(finalG * 255);
    const outBi = Math.round(finalB * 255);

    this.setPixelColor(rgbaToInt(outRi, outGi, outBi, 255), x, y);
  });

  const finalOutputPath = outputPath || path.join(environment.supportPath, `brick-output-${Date.now()}.png`);

  const supportDir = path.dirname(finalOutputPath);
  if (!fs.existsSync(supportDir)) {
    fs.mkdirSync(supportDir, { recursive: true });
  }

  await image.write(finalOutputPath as `${string}.${string}`);

  return finalOutputPath;
}
