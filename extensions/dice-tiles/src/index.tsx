import React, { useCallback } from "react";
import { useGameState } from "./hooks/useGameState";
import { useGameActions } from "./hooks/useGameActions";
import { GameDisplay } from "./components/GameDisplay";
import { GameActions } from "./components/GameActions";

export default function Command() {
  const gameState = useGameState();
  const {
    tiles,
    hp,
    lastRoll,
    selected,
    message,
    gameOver,
    showHelp,
    victories,
    defeats,
    randomLifePattern,
    setTiles,
    setHp,
    setLastRoll,
    setSelected,
    setMessage,
    setGameOver,
    resetGame,
    toggleHelp,
    toggleSelection,
    saveVictoriesWithPattern,
    saveDefeatsWithState,
  } = gameState;

  const gameActions = useGameActions({
    tiles,
    setTiles,
    hp,
    setHp,
    lastRoll,
    setLastRoll,
    selected,
    setSelected,
    setMessage,
    gameOver,
    setGameOver,
    victories,
    defeats,
    randomLifePattern,
    saveVictoriesWithPattern,
    saveDefeatsWithState,
  });

  const handleMainAction = useCallback(() => {
    if (showHelp) toggleHelp();
    else if (gameOver) resetGame();
    else if (lastRoll.length === 0) gameActions.rollDiceHandler();
    else gameActions.validateSelectionHandler();
  }, [showHelp, gameOver, lastRoll.length, toggleHelp, resetGame, gameActions]);

  return (
    <GameDisplay
      hp={hp}
      victories={victories}
      defeats={defeats}
      randomLifePattern={randomLifePattern}
      message={message}
      tiles={tiles}
      selected={selected}
      showHelp={showHelp}
      actions={
        <GameActions
          onMainAction={handleMainAction}
          onToggleHelp={toggleHelp}
          onToggleSelection={toggleSelection}
          onResetGame={resetGame}
        />
      }
    />
  );
}
