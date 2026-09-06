export type RGB = {
  r: number;
  g: number;
  b: number;
};

export type ChannelName = "r" | "g" | "b";

export type MixerChannel = {
  output: ChannelName;
  red: number;
  green: number;
  blue: number;
  constant: number;
  targetValue: number;
};

export type ColorConversion = {
  sourceHex: string;
  targetHex: string;
  sourceRgb: RGB;
  targetRgb: RGB;
  sourceLuminance: number;
  channels: MixerChannel[];
  predictedRgb: RGB;
};

export const LUMINANCE_WEIGHTS: RGB = {
  r: 0.299,
  g: 0.587,
  b: 0.114,
};

const CHANNELS: ChannelName[] = ["r", "g", "b"];
const EPSILON = 0.0001;

export function parseHex(value: string): RGB | null {
  const normalized = value.trim().replace(/^#/, "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((part) => part + part)
          .join("")
      : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) {
    return null;
  }

  return {
    r: Number.parseInt(expanded.slice(0, 2), 16),
    g: Number.parseInt(expanded.slice(2, 4), 16),
    b: Number.parseInt(expanded.slice(4, 6), 16),
  };
}

export function normalizeHex(value: string): string | null {
  const rgb = parseHex(value);
  return rgb ? rgbToHex(rgb) : null;
}

export function rgbToHex(rgb: RGB): string {
  return `#${[rgb.r, rgb.g, rgb.b]
    .map((channel) =>
      Math.max(0, Math.min(255, Math.round(channel)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")
    .toUpperCase()}`;
}

export function luminance(rgb: RGB): number {
  return (
    rgb.r * LUMINANCE_WEIGHTS.r +
    rgb.g * LUMINANCE_WEIGHTS.g +
    rgb.b * LUMINANCE_WEIGHTS.b
  );
}

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function channelFromRgb(rgb: RGB, channel: ChannelName): number {
  return rgb[channel];
}

/**
 * Calculates a stable Channel Mixer matrix.
 *
 * Each output uses the same perceptual-luminance mix. This deliberately avoids
 * independently scaling input channels, which can amplify a single noisy
 * channel and create unwanted color casts. A 100% gain ceiling keeps the
 * coefficients from becoming aggressive; Constant supplies any remaining lift.
 */
export function calculateConversion(
  sourceHex: string,
  targetHex: string,
): ColorConversion | null {
  const sourceRgb = parseHex(sourceHex);
  const targetRgb = parseHex(targetHex);

  if (!sourceRgb || !targetRgb) {
    return null;
  }

  const sourceLuminance = luminance(sourceRgb);
  const channels = CHANNELS.map((output) => {
    const targetValue = channelFromRgb(targetRgb, output);
    const gain =
      sourceLuminance > EPSILON
        ? Math.min(1, targetValue / sourceLuminance)
        : 0;
    const residual = targetValue - gain * sourceLuminance;

    return {
      output,
      red: round(gain * LUMINANCE_WEIGHTS.r * 100),
      green: round(gain * LUMINANCE_WEIGHTS.g * 100),
      blue: round(gain * LUMINANCE_WEIGHTS.b * 100),
      constant: round((residual / 255) * 100),
      targetValue,
    };
  });

  const predictedRgb = {
    r: simulateChannel(sourceRgb, channels[0]),
    g: simulateChannel(sourceRgb, channels[1]),
    b: simulateChannel(sourceRgb, channels[2]),
  };

  return {
    sourceHex: rgbToHex(sourceRgb),
    targetHex: rgbToHex(targetRgb),
    sourceRgb,
    targetRgb,
    sourceLuminance: round(sourceLuminance, 2),
    channels,
    predictedRgb,
  };
}

export function simulateChannel(source: RGB, channel: MixerChannel): number {
  const value =
    (source.r * channel.red) / 100 +
    (source.g * channel.green) / 100 +
    (source.b * channel.blue) / 100 +
    (channel.constant / 100) * 255;

  return Math.max(0, Math.min(255, Math.round(value)));
}

export function formatPercentage(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function formatChannel(channel: MixerChannel): string {
  const label = channel.output.toUpperCase();
  return [
    `輸出色版：${label}`,
    `紅色：${formatPercentage(channel.red)}`,
    `綠色：${formatPercentage(channel.green)}`,
    `藍色：${formatPercentage(channel.blue)}`,
    `常數：${formatPercentage(channel.constant)}`,
  ].join("\n");
}

export function formatConversion(conversion: ColorConversion): string {
  return [
    `來源：${conversion.sourceHex}`,
    `目標：${conversion.targetHex}`,
    `來源感知亮度：${conversion.sourceLuminance}`,
    "",
    ...conversion.channels.map(formatChannel),
    "",
    `預估輸出：${rgbToHex(conversion.predictedRgb)}`,
  ].join("\n\n");
}

export const COMMON_TARGETS = [
  { id: "deep-blue-gray", title: "深冷灰藍", hex: "#1D262D" },
  { id: "neutral-dark-gray", title: "中性深灰", hex: "#5D5B5E" },
  { id: "soft-black", title: "柔黑", hex: "#222222" },
  { id: "paper-white", title: "紙張白", hex: "#EAEAEA" },
  { id: "pure-black", title: "純黑", hex: "#000000" },
  { id: "pure-white", title: "純白", hex: "#FFFFFF" },
];
