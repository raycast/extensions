import { useEffect, useRef, useState } from "react";
import { createInitialState, enqueueDirection, tick } from "./snake-game";
import type { GameState, Point } from "./types";

function getTickSpeed(snakeLength: number): number {
  const baseSpeed = 125;
  const minSpeed = 75;
  const speedDecrement = 5;
  return Math.max(minSpeed, baseSpeed - snakeLength * speedDecrement);
}

export function useGameLoop() {
  const stateRef = useRef<GameState>(createInitialState());
  const [renderState, setRenderState] = useState<GameState>(stateRef.current);
  const [gameOver, setGameOver] = useState(false);
  const tickSpeedRef = useRef(getTickSpeed(stateRef.current.snake.length));

  useEffect(() => {
    if (gameOver) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const runTick = () => {
      const { state: nextState, gameOver: isGameOver } = tick(stateRef.current);

      if (isGameOver) {
        setGameOver(true);
      } else {
        stateRef.current = nextState;
        tickSpeedRef.current = getTickSpeed(nextState.snake.length);
        timeoutId = setTimeout(runTick, tickSpeedRef.current);
      }

      setRenderState({ ...stateRef.current });
    };

    timeoutId = setTimeout(runTick, tickSpeedRef.current);

    return () => clearTimeout(timeoutId);
  }, [gameOver, tick]);

  const changeDirection = (dir: Point) => {
    stateRef.current = enqueueDirection(stateRef.current, dir);
  };

  const restart = () => {
    stateRef.current = createInitialState();
    setRenderState({ ...stateRef.current });
    setGameOver(false);
    tickSpeedRef.current = getTickSpeed(stateRef.current.snake.length);
  };

  return { state: renderState, changeDirection, restart, gameOver };
}
