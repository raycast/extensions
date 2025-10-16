import { useEffect, useState } from "react";
import {
  ActionPanel,
  Action,
  Icon,
  Grid,
  Color,
  Detail,
  environment,
  getPreferenceValues,
  showToast,
  Toast,
} from "@raycast/api";
import { exec } from "child_process";
import { Preferences, State } from "./interface";
import { colorMap, maxLevel } from "./constants";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [state, setState] = useState<State>({
    loading: true,
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
          if (preferences.enableSounds) {
            exec(`afplay "${environment.assetsPath}/sound${color.name}.mp3"`);
          }

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
    newSequence.forEach((color, index) => {
      setTimeout(() => {
        activateColor(color);
      }, (index + 1) * 800);
    });

    setTimeout(() => {
      setState((previous) => ({ ...previous, loading: false }));
    }, (newSequence.length + 1) * 800);
  };

  useEffect(() => {
    if (state.gameState === "play") {
      if (state.sequence.length > 0) {
        let humanSequenceIsCorrect = true;

        state.humanSequence.forEach((color, index) => {
          if (color !== state.sequence[index]) {
            humanSequenceIsCorrect = false;
          }
        });

        if (!humanSequenceIsCorrect) {
          setState((previous) => ({ ...previous, gameState: "lose" }));

          return;
        }

        if (humanSequenceIsCorrect && state.humanSequence.join("") === state.sequence.join("")) {
          if (state.level < maxLevel) {
            setState((previous) => ({
              ...previous,
              level: state.level + 1,
              humanSequence: [],
              loading: true,
            }));

            setTimeout(() => {
              const nextColor = nextLevel();

              animateSequence([...state.sequence, nextColor]);
            }, 800);
          } else {
            exec("open raycast://confetti");

            setState((previous) => ({ ...previous, gameState: "win" }));
          }
        }
      }
    }
  }, [state.gameState, state.humanSequence]);

  if (state.gameState === "lobby") {
    return (
      <Detail
        markdown={`![](file://${environment.assetsPath}/game-${environment.theme}.svg)`}
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
    const won = `![](file://${environment.assetsPath}/won-${environment.theme}.svg)`;
    const lost = `![](file://${environment.assetsPath}/lost-${environment.theme}.svg)`;
    const wonMessage = `Congratulations on making it the full ${maxLevel} levels!`;
    const lostMessage = `You made it to level ${state.sequence.length}. Better luck next time!`;

    showToast({
      style: state.gameState === "win" ? Toast.Style.Success : Toast.Style.Failure,
      title: state.gameState === "win" ? wonMessage : lostMessage,
    });

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
    <Grid
      searchBarPlaceholder="Select the right colors..."
      itemSize={Grid.ItemSize.Medium}
      inset={Grid.Inset.Small}
      isLoading={state.loading}
    >
      <Grid.EmptyView title="Don't Search" description="It's a game, sillyhead!" />
      {state.colors.map((color, index) => (
        <Grid.Item
          key={color.name}
          content={{ source: Icon.Circle, tintColor: color.tint }}
          title={color.name}
          actions={
            <ActionPanel>
              {!state.loading && (
                <Action.SubmitForm
                  title="Select Color"
                  icon={{ source: Icon.Dot, tintColor: color.tint }}
                  onSubmit={() => {
                    activateColor(color.name);

                    setState((previous) => ({
                      ...previous,
                      humanSequence: [...previous.humanSequence, color.name],
                    }));
                  }}
                />
              )}
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
