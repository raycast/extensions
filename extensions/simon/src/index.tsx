import { useEffect, useState } from "react";
import { ActionPanel, Action, Icon, Grid, Color, Detail, environment } from "@raycast/api";
import { exec } from "child_process";

interface State {
  loading: boolean;
  gameState: string;
  level: number;
  sequence: string[];
  humanSequence: string[];
  colors: { name: string; tint: Color }[];
}

export default function Command() {
  const maxLevel = 20;
  const colorMap = {
    Red: Color.Red,
    Green: Color.Green,
    Blue: Color.Blue,
    Yellow: Color.Yellow,
  } as { [key: string]: Color };
  const [state, setState] = useState<State>({
    loading: false,
    gameState: "lobby",
    level: 1,
    sequence: [],
    humanSequence: [],
    colors: [
      { name: "Red", tint: Color.Red },
      { name: "Green", tint: Color.Green },
      { name: "Blue", tint: Color.Blue },
      { name: "Yellow", tint: Color.Yellow },
    ],
  });

  const nextLevel = () => {
    const randomIndex = Math.floor(Math.random() * state.colors.length);
    const nextColor = state.colors[randomIndex].name;

    setState((previous) => ({
      ...previous,
      sequence: [...previous.sequence, nextColor],
    }));

    return nextColor;
  };

  const activateColor = (colorToActivate: string) => {
    setState((previous) => ({
      ...previous,
      colors: previous.colors.map((color) => {
        if (color.name === colorToActivate) {
          exec(`afplay "${environment.assetsPath}/sound${color.name}.mp3"`);

          return { ...color, tint: Color.PrimaryText };
        }

        return color;
      }),
    }));

    setTimeout(() => {
      setState((previous) => ({
        ...previous,
        colors: previous.colors.map((color) => {
          if (color.name === colorToActivate) {
            return { ...color, tint: colorMap[color.name] };
          }

          return color;
        }),
      }));
    }, 500);
  };

  const animateSequence = (newSequence: string[]) => {
    setState((previous) => ({ ...previous, loading: true }));

    newSequence.forEach((color, index) => {
      setTimeout(() => {
        activateColor(color);
      }, (index + 1) * 800);
    });

    setState((previous) => ({ ...previous, loading: false }));
  };

  useEffect(() => {
    if (state.gameState === "play") {
      if (state.sequence.length > 0 && state.humanSequence.length === state.sequence.length) {
        if (state.humanSequence.join("") === state.sequence.join("")) {
          if (state.level < maxLevel) {
            setState((previous) => ({
              ...previous,
              level: state.level + 1,
              humanSequence: [],
            }));

            setTimeout(() => {
              const nextColor = nextLevel();

              animateSequence([...state.sequence, nextColor]);
            }, 800);
          } else {
            exec("open raycast://confetti");

            setState((previous) => ({ ...previous, gameState: "win" }));
          }
        } else {
          setState((previous) => ({ ...previous, gameState: "lose" }));
        }
      }
    }
  }, [state.gameState, state.humanSequence]);

  if (state.gameState === "lobby") {
    return (
      <Detail
        markdown="Press Start Game to start playing!"
        actions={
          <ActionPanel>
            <Action.SubmitForm
              icon={Icon.Star}
              title="Start Game"
              onSubmit={() => {
                setState((previous) => ({ ...previous, gameState: "play" }));

                setTimeout(() => {
                  const nextColor = nextLevel();

                  activateColor(nextColor);

                  animateSequence(state.sequence);
                }, 500);
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (state.gameState === "win" || state.gameState === "lose") {
    const won = `You won, congratulations on making it the full ${maxLevel} levels!`;
    const lost = `You lost, but at least you made it to level ${state.sequence.length}. Better luck next time!`;

    return (
      <Detail
        markdown={state.gameState === "win" ? won : lost}
        actions={
          <ActionPanel>
            <Action.SubmitForm
              icon={Icon.Star}
              title="Play Again"
              onSubmit={() => {
                setState((previous) => ({
                  ...previous,
                  loading: false,
                  gameState: "lobby",
                  level: 1,
                  sequence: [],
                  humanSequence: [],
                }));
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Grid itemSize={Grid.ItemSize.Medium} inset={Grid.Inset.Small} isLoading={state.loading}>
      {state.colors.map((color, index) => (
        <Grid.Item
          key={color.name}
          content={{ source: Icon.Circle, tintColor: color.tint }}
          title={color.name}
          actions={
            <ActionPanel>
              <Action.SubmitForm
                title="Select Color"
                icon={Icon.Dot}
                onSubmit={() => {
                  if (state.loading) {
                    return;
                  }

                  activateColor(color.name);

                  setState((previous) => ({
                    ...previous,
                    humanSequence: [...previous.humanSequence, color.name],
                  }));
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
