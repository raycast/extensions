import { useCallback } from "react";
import { NB_DICE, FACES } from "../constants";
import { rollDice, getDiceEmoji, getLifeEmoji, validateSelection } from "../gameLogic";

interface UseGameActionsProps {
  tiles: number[];
  setTiles: (fn: (prev: number[]) => number[]) => void;
  hp: number;
  setHp: (hp: number) => void;
  lastRoll: number[];
  setLastRoll: (roll: number[]) => void;
  selected: number[];
  setSelected: (selected: number[]) => void;
  message: string;
  setMessage: (message: string) => void;
  gameOver: boolean;
  setGameOver: (gameOver: boolean) => void;
  victories: number;
  defeats: number;
  randomLifePattern: string[];
  saveVictoriesWithPattern: (victories: number) => Promise<void>;
  saveDefeatsWithState: (defeats: number) => Promise<void>;
}

export const useGameActions = ({
  tiles,
  setTiles,
  hp,
  setHp,
  lastRoll,
  setLastRoll,
  selected,
  setSelected,
  message,
  setMessage,
  gameOver,
  setGameOver,
  victories,
  defeats,
  randomLifePattern,
  saveVictoriesWithPattern,
  saveDefeatsWithState,
}: UseGameActionsProps) => {
  const rollDiceHandler = useCallback(() => {
    if (gameOver) return;
    const res = rollDice(NB_DICE, FACES);
    setLastRoll(res);
    setSelected([]);
    setMessage(`${getDiceEmoji(res[0])}  \n${getDiceEmoji(res[1])}`);
  }, [gameOver, setLastRoll, setSelected, setMessage]);

  const validateSelectionHandler = useCallback(async () => {
    if (!lastRoll.length || gameOver) return;

    const { isValid, diceSum, selectedSum } = validateSelection(lastRoll, selected, tiles);

    if (isValid) {
      setTiles((t) => t.filter((x) => !selected.includes(x)));
      if (tiles.length - selected.length === 0) {
        const newVictories = victories + 1;
        await saveVictoriesWithPattern(newVictories);
        setGameOver(true);
        setMessage(
          `🎉 Victory! Cleared all tiles! Total victories: ${newVictories} ${getLifeEmoji(victories, randomLifePattern)} — Press Enter to restart 🕹️`,
        );
      } else {
        setMessage(`✅ Good combination! You matched ${selectedSum} 🎯`);
      }
    } else {
      const newHp = Math.max(0, hp - diceSum);
      setHp(newHp);
      setMessage(`❌ Bad combination (${selectedSum} ≠ ${diceSum}) → -${diceSum} HP 💔`);
      if (newHp === 0) {
        const newDefeats = defeats + 1;
        await saveDefeatsWithState(newDefeats);
        setGameOver(true);
        setMessage(`💀 Defeat! Total defeats: ${newDefeats}. Press Enter to restart 🕹️`);
      }
    }

    setSelected([]);
    setLastRoll([]);
  }, [
    lastRoll,
    gameOver,
    selected,
    tiles,
    setTiles,
    victories,
    randomLifePattern,
    saveVictoriesWithPattern,
    hp,
    setHp,
    setMessage,
    setGameOver,
    saveDefeatsWithState,
    setSelected,
    setLastRoll,
  ]);

  const handleMainAction = useCallback(
    (showHelp: boolean, resetGame: () => void) => {
      if (showHelp) return { action: "toggleHelp" };
      else if (gameOver) return { action: "reset", resetGame };
      else if (lastRoll.length === 0) return { action: "roll" };
      else return { action: "validate" };
    },
    [gameOver, lastRoll.length],
  );

  return {
    rollDiceHandler,
    validateSelectionHandler,
    handleMainAction,
  };
};
