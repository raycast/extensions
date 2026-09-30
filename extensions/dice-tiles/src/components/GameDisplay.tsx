import React, { useMemo } from "react";
import { Detail } from "@raycast/api";
import { renderHP, getLifeEmoji, getRewardTeaser } from "../gameLogic";

interface GameDisplayProps {
  hp: number;
  victories: number;
  defeats: number;
  randomLifePattern: string[];
  message: string;
  tiles: number[];
  selected: number[];
  showHelp: boolean;
  actions: React.ReactNode;
}

const HELP_MARKDOWN = `
# 🎲 Dice Tiles - Help

**Rules:**  
- Press Enter to roll dice.  
- Select tiles that sum up to dice roll.  
- Shift + [1-0] to select/deselect tiles.  
- Correct sum → tiles removed ✅  
- Wrong sum → lose HP ❌  
- HP 0 → Defeat 💀  
- Clear all tiles → Victory 🎉  
- Shift + R → Reset game

**Shortcuts:**  
- Shift + 1…0 → Select/Deselect tiles  
- Enter → Roll/Validate/Restart  
- Shift + R → Reset  
- Shift + H → Toggle Help

**Links:**  
- [GitHub Repository](https://github.com/Jumitti/dice-tiles)  
- [Buy Me a Coffee ☕](https://www.buymeacoffee.com/Jumitti)
`;

export const GameDisplay = React.memo<GameDisplayProps>(
  ({ hp, victories, defeats, randomLifePattern, message, tiles, selected, showHelp, actions }) => {
    const renderTiles = useMemo(
      () => tiles.map((n) => (selected.includes(n) ? `[${n}]` : `${n}`)).join(" "),
      [tiles, selected],
    );

    const rewardTeaser = useMemo(() => getRewardTeaser(victories), [victories]);

    const markdown = useMemo(() => {
      if (showHelp) return HELP_MARKDOWN;

      return `
# 🎲 Dice Tiles

**HP: ${renderHP(hp, victories, randomLifePattern)}**  
**Victories: ${victories}** | **Defeats: ${defeats}**  
${rewardTeaser}

${hp <= 0 ? "💀 Defeat!" : tiles.length === 0 ? `🎉 Victory! ${getLifeEmoji(victories, randomLifePattern)}` : message}

---

**Remaining tiles:**
\`\`\`
${renderTiles}
\`\`\`

---

Press Shift + H for Help and Rules
`;
    }, [showHelp, hp, victories, defeats, randomLifePattern, message, tiles, rewardTeaser, renderTiles]);

    return <Detail markdown={markdown} actions={actions} />;
  },
);

GameDisplay.displayName = "GameDisplay";
