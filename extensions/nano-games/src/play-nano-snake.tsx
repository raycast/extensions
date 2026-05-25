import { Action, ActionPanel, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { gridToBraille } from "./lib/braille-renderer";
import { getDirectionFromChar } from "./lib/key-mapping";
import { getHighScore, saveHighScore } from "./lib/storage";
import { useGameLoop } from "./lib/use-game-loop";

export default function Command() {
  const { state, changeDirection, restart, gameOver } = useGameLoop();
  const { data: highScore, revalidate } = useCachedPromise(getHighScore);
  const prevDisplayRef = useRef("");
  const [allowClear, setAllowClear] = useState(false);

  const display = gameOver
    ? "💀☠️🦴💀☠️🦴💀☠️🦴💀☠️🦴💀☠️🦴💀☠️🦴💀☠️🦴💀☠️🦴💀☠️🦴💀☠️🦴💀☠️"
    : `|${gridToBraille(state.grid)}|`;

  useEffect(() => {
    prevDisplayRef.current = display;
  }, [display]);

  useEffect(() => {
    if (gameOver) {
      const handleGameOver = async () => {
        const finalGrid = `|${gridToBraille(state.grid)}|`;
        const isNewHighScore = await saveHighScore(state.score, finalGrid);
        if (isNewHighScore) {
          await showToast({
            style: Toast.Style.Success,
            title: "🎉 New High Score!",
            message: `Score: ${state.score}`,
          });
        }
        revalidate();
      };
      handleGameOver();
    }
  }, [gameOver]);

  const handleSearchTextChange = (text: string) => {
    const prevDisplay = prevDisplayRef.current;

    // User cleared (ESC) - allow it so second ESC can close
    if (text.length < prevDisplay.length) {
      setAllowClear(true);
      return;
    }

    if (!gameOver) setAllowClear(false);

    // Extract typed characters (what was added beyond the display)
    let typedChars = "";
    if (text.startsWith(prevDisplay)) {
      typedChars = text.slice(prevDisplay.length);
    } else if (text.endsWith(prevDisplay)) {
      typedChars = text.slice(0, -prevDisplay.length);
    } else {
      // Find the difference
      for (let i = 0; i < text.length; i++) {
        if (!prevDisplay.includes(text[i]) || text[i] !== prevDisplay[i]) {
          typedChars = text.slice(i);
          break;
        }
      }
    }

    // Ignore paste events (multiple characters)
    if (typedChars.length > 3) {
      return;
    }

    // Process the last typed character (only when playing)
    if (!gameOver && typedChars.length > 0) {
      const lastChar = typedChars.slice(-1);
      const direction = getDirectionFromChar(lastChar);

      if (direction) {
        changeDirection(direction);
      }
    }
  };

  const highScoreText = highScore ? `High Score: ${highScore.score}` : "No high score yet";
  const statusText = gameOver ? "💀☠️🦴 GAME OVER 💀☠️🦴" : "🎮 Playing";
  const controlsHint = "W↑ A← S↓ D→ or H← J↓ K↑ L→ • ⌘R restart";

  return (
    <List
      filtering={false}
      searchBarPlaceholder={controlsHint}
      onSearchTextChange={handleSearchTextChange}
      searchText={allowClear ? "" : display}
      navigationTitle={`🐍 Score: ${state.score}${highScore ? ` • Best: ${highScore.score} 🏆` : ""}`}
    >
      <List.EmptyView
        description={`${statusText} • Score: ${state.score} • ${highScoreText}

${controlsHint}`}
        actions={
          <ActionPanel>
            <Action
              title="Restart Game"
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={() => {
                setAllowClear(false);
                restart();
              }}
            />
            <Action.CopyToClipboard
              title="Copy Score"
              content={`🐍 Snake - Score: ${state.score}\n${display}`}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
