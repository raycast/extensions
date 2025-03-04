import type { DisplayMode, ObliqueStrategy } from "./types";
import obliqueStrategies from "./oblique-strategies.json";

export function getRandomObliqueStrategy(): ObliqueStrategy {
  return obliqueStrategies[Math.floor(Math.random() * obliqueStrategies.length)];
}

export function getMarkdown(strategy: string, displayMode: DisplayMode = "basic", italics = false) {
  const isMultiline = strategy.includes("\n");
  if (italics && displayMode !== "code" && !!strategy && !isMultiline) {
    strategy = `*${strategy}*`;
  }
  switch (displayMode) {
    case "basic":
      return strategy;
    case "code":
      return `\`\`\`\n${strategy}\n\`\`\``;
    case "box":
      if (isMultiline) {
        return `| **${strategy.split("\n")[0].trim()}** |\n| - |\n| ${strategy.split("\n").slice(1).join(" |\n| ")} |`;
      }
      return `| ${strategy} |\n| - |`;
    default: {
      const level = displayMode.replace("h", "");
      return `${"#".repeat(Number(level))} ${strategy}`;
    }
  }
}
