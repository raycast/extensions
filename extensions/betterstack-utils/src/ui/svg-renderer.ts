import satori from "satori";
import type { ReactNode } from "react";
import { Colors, RotaColors } from "@/common/colors";
import path from "node:path";
import { environment } from "@raycast/api";
import { readFileSync } from "node:fs";
import { pulseAnimation } from "@/ui/schedule/pulse-animation";

export interface SatoriFont {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 700;
  style: "normal";
}

const VIEWPORT_WIDTH = 1160;

const svgPostProcessors: Array<(svg: string) => string> = [pulseAnimation];

export async function renderToSvg(element: ReactNode): Promise<string> {
  const svg = await satori(element, {
    width: VIEWPORT_WIDTH,
    fonts: loadFonts(),
    tailwindConfig: {
      theme: {
        extend: {
          fontFamily: {
            mono: "JetBrainsMono",
          },
          colors: {
            "deep-dark": Colors.DEEP_DARK,
            dark: Colors.DARK,
            slate: Colors.SLATE,
            dim: Colors.DIM,
            subtle: Colors.SUBTLE,
            frost: Colors.FROST,
            skeleton: Colors.SKELETON,
            "rota-blue": RotaColors.BLUE,
            "rota-green": RotaColors.GREEN,
            "rota-indigo": RotaColors.INDIGO,
            "rota-orange": RotaColors.ORANGE,
            "rota-purple": RotaColors.PURPLE,
            "rota-red": RotaColors.RED,
            "rota-yellow": RotaColors.YELLOW,
          },
        },
      },
    },
  });
  return svgPostProcessors.reduce((currentSvg, processor) => processor(currentSvg), svg);
}

export function loadFonts(): SatoriFont[] {
  return [
    { name: "Inter", data: readFont("Inter-Regular.ttf"), weight: 400, style: "normal" },
    { name: "Inter", data: readFont("Inter-Bold-Static.ttf"), weight: 700, style: "normal" },
    { name: "JetBrainsMono", data: readFont("JetBrainsMono-Regular.ttf"), weight: 400, style: "normal" },
  ];
}

const readFont = (filename: string): ArrayBuffer => {
  const fontPath = path.join(environment.assetsPath, "fonts", filename);
  try {
    return toArrayBuffer(readFileSync(fontPath));
  } catch {
    throw new Error(`Font file not found at ${fontPath}. Ensure ${filename} is present in assets/fonts/.`);
  }
};

const toArrayBuffer = (buffer: Buffer): ArrayBuffer => {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
};
