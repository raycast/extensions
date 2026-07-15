import crypto from "node:crypto";
import {
  GPU_VENDORS,
  SCREEN_RESOLUTIONS,
  COLOR_DEPTH_OPTIONS,
  DEVICE_MEMORY_OPTIONS,
  CORE_OPTIONS,
  CANVAS_HASH,
} from "../data/fingerprintData.js";

function weightedRandomChoice<T>(options: T[], weights: number[]): T {
  const total = weights.reduce((acc, w) => acc + w, 0);
  const pick = Math.random() * total;
  let cumulative = 0;
  for (let i = 0; i < options.length; i += 1) {
    cumulative += weights[i] ?? 0;
    if (pick <= cumulative) {
      return options[i]!;
    }
  }
  return options[options.length - 1]!;
}

export function choiceWithWeights<T>(options: T[], weights: number[]): T {
  return weightedRandomChoice(options, weights);
}

export function getRendererInfo(): [string, string] {
  const rendererStr = weightedRandomChoice(
    GPU_VENDORS,
    GPU_VENDORS.map(() => 1),
  );
  const [vendor, renderer] = rendererStr.split("|");
  return [vendor ?? "", renderer ?? ""];
}

export function getScreenConfig(): { width: number; height: number; availWidth: number; availHeight: number } {
  const resolution = weightedRandomChoice(SCREEN_RESOLUTIONS.resolutions, SCREEN_RESOLUTIONS.weights);
  const [widthStr, heightStr] = resolution.split(";");
  const width = Number(widthStr);
  const height = Number(heightStr);

  if (Math.random() < 0.5) {
    const availWidth = width - Number(weightedRandomChoice([0, 30, 60, 80], [0.1, 0.4, 0.3, 0.2]));
    return { width, height, availWidth, availHeight: height };
  }
  const availHeight = height - Number(weightedRandomChoice([30, 60, 80, 100], [0.2, 0.5, 0.2, 0.1]));
  return { width, height, availWidth: width, availHeight };
}

export function generateCanvasHash(): string {
  return CANVAS_HASH;
}

export function generateWebglHash(): string {
  return crypto.createHash("md5").update(crypto.randomBytes(32)).digest("hex");
}

export function colorDepth(): number {
  return weightedRandomChoice(COLOR_DEPTH_OPTIONS.values, COLOR_DEPTH_OPTIONS.weights);
}

export function deviceMemory(): number {
  return weightedRandomChoice(DEVICE_MEMORY_OPTIONS.values, DEVICE_MEMORY_OPTIONS.weights);
}

export function coreCount(): number {
  return weightedRandomChoice(CORE_OPTIONS.values, CORE_OPTIONS.weights);
}
