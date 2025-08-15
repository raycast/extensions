import { useState } from "react";
import { showToast, Toast } from "@raycast/api";

const EMOJIS = ["💰", "✨", "🎯", "💎", "🚀", "💫", "🌟"];
const getRandomEmoji = () => EMOJIS[Math.floor(Math.random() * EMOJIS.length)];

export function useClickEffect() {
  const [lastClickValue, setLastClickValue] = useState(0);
  const [lastCombo, setLastCombo] = useState(1);

  const triggerClickEffect = (value: number, combo: number) => {
    setLastClickValue(value);
    setLastCombo(combo);

    // Show toast notification for the click
    showToast({
      style: Toast.Style.Success,
      title: `+${value.toFixed(1)} points`,
      message: combo > 1 ? `Combo x${combo}!` : undefined,
      primaryAction: {
        title: getRandomEmoji(),
        onAction: () => {},
      },
    });
  };

  return {
    lastClickValue,
    lastCombo,
    triggerClickEffect,
  };
}
