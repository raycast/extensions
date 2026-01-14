import { REWARD_EMOJIS, REWARD_THRESHOLDS, RANDOM_EMOJIS, DICE_EMOJIS, HP_INIT } from "./constants";

export const rollDice = (nbDice: number, faces: number): number[] => {
  return Array.from({ length: nbDice }, () => Math.floor(Math.random() * faces) + 1);
};

export const getDiceEmoji = (diceValue: number): string => {
  return DICE_EMOJIS[diceValue] || "🎲";
};

export const getLifeEmoji = (victories: number, randomLifePattern: string[]): string => {
  if (victories >= 500) {
    return randomLifePattern.length ? randomLifePattern[0] : RANDOM_EMOJIS[0];
  }
  let idx = REWARD_THRESHOLDS.findIndex((t) => victories < t) - 1;
  if (idx < 0) idx = 0;
  if (idx >= REWARD_EMOJIS.length) idx = REWARD_EMOJIS.length - 1;
  return REWARD_EMOJIS[idx];
};

export const renderHP = (hp: number, victories: number, randomLifePattern: string[]): string => {
  if (victories >= 500 && randomLifePattern.length) {
    return randomLifePattern.slice(0, Math.min(hp, HP_INIT)).join("") + ` (${hp})`;
  }
  return getLifeEmoji(victories, randomLifePattern).repeat(Math.min(hp, HP_INIT)) + ` (${hp})`;
};

export const generateRandomLifePattern = (): string[] => {
  return Array.from({ length: HP_INIT }, () => RANDOM_EMOJIS[Math.floor(Math.random() * RANDOM_EMOJIS.length)]);
};

export const validateSelection = (
  lastRoll: number[],
  selected: number[],
): { isValid: boolean; diceSum: number; selectedSum: number } => {
  const diceSum = lastRoll.reduce((a, b) => a + b, 0);
  const selectedSum = selected.reduce((a, b) => a + b, 0);
  return {
    isValid: selectedSum === diceSum,
    diceSum,
    selectedSum,
  };
};

export const getRewardTeaser = (victories: number): string => {
  if (victories >= 500) {
    return "🎇 MAX LEVEL REACHED!";
  }

  const nextRewardIndex = REWARD_THRESHOLDS.findIndex((t) => victories < t);
  if (nextRewardIndex >= 0 && nextRewardIndex < REWARD_THRESHOLDS.length) {
    const remaining = REWARD_THRESHOLDS[nextRewardIndex] - victories;
    return `Next reward in ${remaining} victories 🥳`;
  } else if (victories < 500) {
    return `Next reward in ${500 - victories} victories 🚀`;
  }

  return "";
};
