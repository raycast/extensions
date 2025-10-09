import {
  ActionPanel,
  Color,
  Detail,
  Icon,
  showToast,
  Action,
  Image,
  Keyboard,
  Toast,
  Environment,
  environment,
} from "@raycast/api";
import { useEffect, useState } from "react";
import useInterval from "use-interval";
import { Game, GameScore, Move } from "../lib/game";

function CursorAction(props: {
  game: Game;
  move: Move;
  title: string;
  shortcut?: Keyboard.Shortcut | undefined;
  icon?: Image.ImageLike | undefined;
}): JSX.Element {
  return (
    <Action
      title={props.title}
      shortcut={props.shortcut}
      icon={props.icon}
      onAction={() => props.game.move(props.move)}
    />
  );
}

export type TextSize = Environment["textSize"];

export function SnakeGame(): JSX.Element {
  const [error, setError] = useState<string>();
  const [pause, setPause] = useState<boolean>(false);
  const textSize: TextSize = environment.textSize;

  const { field, game, score, message, restart } = useGame(setError, textSize);
  const speedMs = error || message ? null : game.getSpeedMs();

  useInterval(
    () => {
      if (textSize !== undefined) {
        game.draw();
      }
    },
    pause ? null : speedMs,
  );

  const codefence = "```" + field + "```";
  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: error,
    });
  }

  const scoreText = (): string => {
    if (score) {
      return `Foods: ${score.food}, Speed: ${score.speed}`;
    }
    return "";
  };

  const parts: string[] = [];
  if (message) {
    const st = scoreText();
    parts.push(`## ${message}` + (st ? "          " + st : ""));
  } else if (score) {
    let text = scoreText();
    if (process.env.NODE_ENV === "development") {
      text += ` (${speedMs ? speedMs : "?"}ms)`;
    }
    parts.push(text);
  }
  parts.push(codefence);

  const md = textSize !== undefined ? parts.join("\n\n") : "---";
  return (
    <Detail
      isLoading={textSize === undefined}
      markdown={md}
      actions={
        <ActionPanel>
          {message === undefined && (
            <Action
              title={pause ? "Continue" : "Pause"}
              icon={{ source: pause ? "play.png" : "pause.png", tintColor: Color.PrimaryText }}
              onAction={() => setPause(!pause)}
            />
          )}
          <Action title="Restart Game" icon={{ source: Icon.ArrowClockwise }} onAction={() => restart()} />
          <Action.CopyToClipboard title="Copy Score to Clipboard" content={score?.food || 0} />
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

function useGame(
  setError: React.Dispatch<React.SetStateAction<string | undefined>>,
  textSize: TextSize,
): {
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
    game.start(textSize);
    game.flush();
    setMessage(undefined);
  };

  useEffect(() => {
    if (textSize !== undefined) {
      game.flush();
      game.start(textSize);
      game.draw();
    }
  }, [textSize]);
  return { field, game, score, message, restart };
}
