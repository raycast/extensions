import { LABEL_BANK } from "../shared/labels";
import { DICE_SPIN_FRAMES, LABEL_HOLD_FRAMES } from "./constants";

import type { DiceResult } from "./types";

export type RollDiceOptions = {
  quantity?: number;
  random?: () => number;
  sides?: number;
};

const DICE_FACE_BY_RESULT: Record<DiceResult, string> = {
  1: "⚀",
  2: "⚁",
  3: "⚂",
  4: "⚃",
  5: "⚄",
  6: "⚅",
};

export default function rollDice({ quantity = 1, random = Math.random, sides = 6 }: RollDiceOptions): number[] {
  return Array.from({ length: quantity }, () => Math.floor(random() * sides) + 1);
}

export function rollSingleDie(random: () => number = Math.random): DiceResult {
  return rollDice({ quantity: 1, random, sides: 6 })[0] as DiceResult;
}

export function formatRollDiceMarkdown(result: DiceResult): string {
  return `# ${DICE_FACE_BY_RESULT[result]} ${result}`;
}

export function formatRollingMarkdown(frameIndex: number, label: string): string {
  const face = DICE_SPIN_FRAMES[frameIndex] ?? DICE_SPIN_FRAMES[0] ?? "⚀";

  return ["# Rolling the Die", `# ${face}`, "", `**${label}...**`].join("\n");
}

export function pickRandomLabel(excluded: string | null): string {
  let label = LABEL_BANK[Math.floor(Math.random() * LABEL_BANK.length)] ?? LABEL_BANK[0];

  if (LABEL_BANK.length === 1) {
    return label ?? (LABEL_BANK[0] as string);
  }

  while (label === excluded) {
    label = LABEL_BANK[Math.floor(Math.random() * LABEL_BANK.length)] ?? label;
  }

  return label ?? (LABEL_BANK[0] as string);
}

export function buildRollLabels(frameCount: number): string[] {
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
