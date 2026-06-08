import { COIN_ROWS, FLIP_LABEL_BANK, LABEL_HOLD_FRAMES } from "./constants";
import type { FlipCoinOptions, FlipFrame } from "./types"; /**
 * Get a random result of a coin flip.
 * @param {() => number} random - The random number generator.
 * @returns {FlipCoinOptions} The result of the coin flip.
 */
export function flipCoin(random: () => number = Math.random): FlipCoinOptions {
  return random() < 0.5 ? "tails" : "heads";
}

/**
 * Format the result of a coin flip into a markdown string.
 * @param {FlipCoinOptions} result - The result of the coin flip.
 * @returns {string} The formatted markdown string.
 */
export function formatFlipCoinMarkdown(result: FlipCoinOptions): string {
  const emoji = result === "heads" ? "🪙" : "🎯";
  const title = result === "heads" ? "Heads" : "Tails";

  return `# ${emoji} ${title}\n\nThe coin has landed on **${title}**.`;
}

/**
 * Pick a random label from the label bank.
 * @param {string | null} excluded - The label to exclude.
 * @returns {string} The random label.
 */
export function pickRandomLabel(excluded: string | null): string {
  // current label
  let label = FLIP_LABEL_BANK[Math.floor(Math.random() * FLIP_LABEL_BANK.length)] ?? "Consulting destiny";

  if (FLIP_LABEL_BANK.length === 1) {
    return label;
  }

  // pick new label until it is not the same as the excluded label
  while (label === excluded) {
    label = FLIP_LABEL_BANK[Math.floor(Math.random() * FLIP_LABEL_BANK.length)] ?? label;
  }

  return label;
}

/**
 * Build an array of labels for the flipping animation.
 * @param {number} frameCount - The number of frames to build.
 * @returns {string[]} The array of labels.
 */
export function buildFlipLabels(frameCount: number): string[] {
  const labels: string[] = [];
  let previousLabel: string | null = null;

  while (labels.length < frameCount) {
    const label = pickRandomLabel(previousLabel);

    for (let index = 0; index < LABEL_HOLD_FRAMES && labels.length < frameCount; index += 1) {
      labels.push(label);
    }

    previousLabel = label;
  }

  return labels;
}

/**
 * Format the flipping animation into a markdown string.
 * @param {FlipFrame} frame - The frame to format.
 * @param {string} label - The label to format.
 * @returns {string} The formatted markdown string.
 */
export function formatFlippingMarkdown(frame: FlipFrame, label: string): string {
  const rows = Array.from({ length: COIN_ROWS }, () => "");
  rows[frame.row] = `        ${frame.symbol}`;
  rows.push("", `      ${frame.shadow}`);

  return ["# Tossing the Coin", "", "```text", ...rows, "```", "", `**${label}...**`].join("\n");
}
