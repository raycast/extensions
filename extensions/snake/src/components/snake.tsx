import {
  ActionPanel,
  CopyToClipboardAction,
  Detail,
  Icon,
  ImageLike,
  KeyboardShortcut,
  showToast,
  Toast,
  ToastStyle,
} from "@raycast/api";
import { useEffect, useState } from "react";
import useInterval from "use-interval";
import { Game, GameScore, Move } from "../lib/game";

function CursorAction(props: {
  game: Game;
  move: Move;
  title: string;
  shortcut?: KeyboardShortcut | undefined;
  icon?: ImageLike | undefined;
}): JSX.Element {
  return (
    <ActionPanel.Item
      title={props.title}
      shortcut={props.shortcut}
      icon={props.icon}
      onAction={() => props.game.move(props.move)}
    />
  );
}

export function SnakeGame(): JSX.Element {
  const [error, setError] = useState<string>();
  const { field, game, score, message, restart } = useGame(setError);
  useInterval(
    () => {
      game.draw();
    },
    error || message ? null : game.speedMs
  );

  const codefence = "```" + field + "```";
  if (error) {
    showToast(ToastStyle.Failure, "Error", error);
  }

  const parts: string[] = [];
  if (message) {
    parts.push(`# ${message}`);
  } else if (score) {
    parts.push(`Foods: ${score.food}, Speed: ${score.speed}`);
  }
  parts.push(codefence);

  const md = parts.join("\n\n");
  return (
    <Detail
      markdown={md}
      actions={
        <ActionPanel>
          <ActionPanel.Item title="Restart Game" icon={{ source: Icon.ArrowClockwise }} onAction={() => restart()} />
          <CopyToClipboardAction title="Copy Score to Clipboard" content={score?.food || 0} />
          <CursorAction
            game={game}
            title="Up"
            icon={{ source: "⬆️" }}
            move={Move.up}
            shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
          />
          <CursorAction
            game={game}
            title="Down"
            icon={{ source: "⬇️" }}
            move={Move.down}
            shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
          />
          <CursorAction
            game={game}
            title="Left"
            icon={{ source: "⬅️" }}
            move={Move.left}
            shortcut={{ modifiers: ["cmd", "shift"], key: "arrowLeft" }}
          />
          <CursorAction
            game={game}
            title="Right"
            icon={{ source: "➡️" }}
            move={Move.right}
            shortcut={{ modifiers: ["cmd", "shift"], key: "arrowRight" }}
          />
        </ActionPanel>
      }
    />
  );
}

function useGame(setError: React.Dispatch<React.SetStateAction<string | undefined>>): {
  field: string;
  game: Game;
  score: GameScore | undefined;
  message: string | undefined;
  restart: () => void;
} {
  const [field, setField] = useState<string>("");
  const [score, setScore] = useState<GameScore>();
  const [message, setMessage] = useState<string>();
  const [game] = useState<Game>(new Game(setField, setError, setScore, setMessage));

  const restart = () => {
    game.start();
    game.flush();
    setMessage(undefined);
  };

  useEffect(() => {
    let cancel = false;
    game.flush();
    game.start();

    return () => {
      cancel = true;
    };
  }, []);
  return { field, game, score, message, restart };
}
