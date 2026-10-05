// Display Chaos Index visualization with official scale

import { Detail } from "@raycast/api";

interface ChaosIndexDetailProps {
  score: number;
  description: string;
}

export function ChaosIndexDetail({ score, description }: ChaosIndexDetailProps) {
  const getEmoji = (score: number): string => {
    if (score <= 20) return "🟢";
    if (score <= 40) return "🟡";
    if (score <= 60) return "🟠";
    if (score <= 80) return "🔴";
    return "🔥";
  };

  const getDescription = (score: number): string => {
    if (score <= 20) return "The world is cool and stable (minimal chaos)";
    if (score <= 40) return "The world is warming up with mild turbulence";
    if (score <= 60) return "The world is hot with moderate chaos";
    if (score <= 80) return "The world is very hot with high instability";
    return "The world is on fire with severe chaos";
  };

  const getColoredBar = (score: number): string => {
    const emoji = getEmoji(score);
    const filled = Math.round(score / 5);
    const empty = 20 - filled;
    return emoji.repeat(filled) + "◌".repeat(empty);
  };

  const markdown = `## Global Chaos Index

Score: ${score}/100

${getEmoji(score)} ${getDescription(score)}

Progress: ${getColoredBar(score)} ${score}%

## Analysis

${description}

## Scale Reference

- **0-20:** Cool and stable 🟢
- **21-40:** Warming up 🟡
- **41-60:** Hot with moderate chaos 🟠
- **61-80:** Very hot and unstable 🔴
- **81-100:** On fire with severe chaos 🔥
`;

  return <Detail markdown={markdown} />;
}
