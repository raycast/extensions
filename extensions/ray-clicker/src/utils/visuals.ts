import { Color } from "@raycast/api";

export const getUpgradeColor = (tier: number): string => {
  const colors = [
    Color.PrimaryText, // Tier 0
    Color.Blue, // Tier 1
    Color.Green, // Tier 2
    Color.Purple, // Tier 3
    Color.Orange, // Tier 4
    Color.Red, // Tier 5
    Color.Yellow, // Tier 6+
  ];
  return colors[Math.min(tier, colors.length - 1)];
};

export const getBackgroundColor = (comboMultiplier: number): string => {
  if (comboMultiplier <= 1) return "transparent";

  const hue = (Date.now() / 100) % 360;
  return `hsla(${hue}, 80%, 90%, 0.05)`;
};

export const getRandomEmoji = (): string => {
  const emojis = ["💰", "✨", "🎯", "💎", "🚀", "💫", "🌟", "⚡", "🔥", "🎉"];
  return emojis[Math.floor(Math.random() * emojis.length)];
};

export const getMilestoneMessage = (prevPoints: number, points: number): string | null => {
  const milestones = [
    { threshold: 10, message: "First steps!" },
    { threshold: 100, message: "100 points!" },
    { threshold: 1000, message: "1K points!" },
    { threshold: 10000, message: "10K points!" },
    { threshold: 100000, message: "100K points!" },
    { threshold: 1000000, message: "1M points!" },
  ];

  // Detect threshold crossings to avoid missing milestones when increments are large
  const milestone = milestones.find((m) => prevPoints < m.threshold && points >= m.threshold);
  return milestone ? milestone.message : null;
};
