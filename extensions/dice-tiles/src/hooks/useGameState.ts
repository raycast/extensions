import { useState, useEffect, useCallback } from "react";
import { NB_TILES, HP_INIT } from "../constants";
import { generateRandomLifePattern } from "../gameLogic";
import { loadVictories, loadDefeats, saveVictories, saveDefeats } from "../storage";

export const useGameState = () => {
  const [tiles, setTiles] = useState<number[]>(Array.from({ length: NB_TILES }, (_, i) => i + 1));
  const [hp, setHp] = useState(HP_INIT);
  const [lastRoll, setLastRoll] = useState<number[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [message, setMessage] = useState("Press Enter to roll the dice 🎲");
  const [gameOver, setGameOver] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [victories, setVictories] = useState<number>(0);
  const [defeats, setDefeats] = useState<number>(0);
  const [randomLifePattern, setRandomLifePattern] = useState<string[]>([]);

  // Load initial data
  useEffect(() => {
    (async () => {
      const vNum = await loadVictories();
      const dNum = await loadDefeats();
      setVictories(vNum);
      setDefeats(dNum);

      if (vNum >= 500) {
        const pattern = generateRandomLifePattern();
        setRandomLifePattern(pattern);
      }
    })();
  }, []);

  // Reset game function
  const resetGame = useCallback(() => {
    setHp(HP_INIT);
    setTiles(Array.from({ length: NB_TILES }, (_, i) => i + 1));
    setLastRoll([]);
    setSelected([]);
    setGameOver(false);
    setShowHelp(false);
    setMessage("New game 🎲 Press Enter to roll the dice!");
  }, []);

  // Toggle help
  const toggleHelp = useCallback(() => {
    setShowHelp((prev) => !prev);
  }, []);

  // Toggle tile selection
  const toggleSelection = useCallback(
    (n: number) => {
      if (!tiles.includes(n) || gameOver) return;
      setSelected((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));
    },
    [tiles, gameOver],
  );

  // Save victories with pattern generation
  const saveVictoriesWithPattern = useCallback(
    async (newVictories: number) => {
      setVictories(newVictories);
      await saveVictories(newVictories);
      if (newVictories >= 500 && randomLifePattern.length === 0) {
        const pattern = generateRandomLifePattern();
        setRandomLifePattern(pattern);
      }
    },
    [randomLifePattern.length],
  );

  // Save defeats
  const saveDefeatsWithState = useCallback(async (newDefeats: number) => {
    setDefeats(newDefeats);
    await saveDefeats(newDefeats);
  }, []);

  return {
    // State
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
    showHelp,
    victories,
    defeats,
    randomLifePattern,

    // Actions
    resetGame,
    toggleHelp,
    toggleSelection,
    saveVictoriesWithPattern,
    saveDefeatsWithState,
  };
};
