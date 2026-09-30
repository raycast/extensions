import { Color, Image } from "@raycast/api";

export const getStrengthIcon = (strength: number): { source: Image.Source; tintColor?: Color.ColorLike } => {
  const entropy = [
    {
      bits: 28,
      color: "#e44759",
      icon: "💀",
      name: "very_weak",
    },
    {
      bits: 35,
      color: "#f8b32d",
      icon: "😢",
      name: "weak",
    },
    {
      bits: 60,
      color: "#67a4d3",
      icon: "😐",
      name: "reasonable",
    },
    {
      bits: 128,
      color: "#33ccb1",
      icon: "😎",
      name: "strong",
    },
    {
      bits: Infinity,
      color: "#33cc33",
      icon: "🤩",
      name: "very_strong",
    },
  ];

  let source = entropy[0].icon;

  for (const element of entropy) {
    if (strength < element.bits) {
      source = element.icon;
      break;
    }
  }

  return {
    source,
  };
};
