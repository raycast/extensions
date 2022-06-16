import { useEffect, useState } from "react";
import { ActionPanel, Action, Icon, Grid, Color, Detail } from "@raycast/api";

export default function Command() {
  const maxLevel = 3;
  const colourMap = {
    Red: Color.Red,
    Green: Color.Green,
    Blue: Color.Blue,
    Yellow: Color.Yellow,
  } as { [key: string]: Color };
  const [state, setState] = useState({
    loading: false,
    gameState: "lobby",
    level: 1,
    sequence: [] as string[],
    humanSequence: [] as string[],
    colours: [
      { name: "Red", tint: Color.Red },
      { name: "Green", tint: Color.Green },
      { name: "Blue", tint: Color.Blue },
      { name: "Yellow", tint: Color.Yellow },
    ],
  });

  const nextLevel = () => {
    const randomIndex = Math.floor(Math.random() * state.colours.length);
    const nextColour = state.colours[randomIndex].name;

    setState((previous) => ({
      ...previous,
      sequence: [...previous.sequence, nextColour],
    }));

    return nextColour;
  };

  const activateColour = (colourToActivate: string) => {
    setState((previous) => ({
      ...previous,
      colours: previous.colours.map((colour) => {
        if (colour.name === colourToActivate) {
          return { ...colour, tint: Color.PrimaryText };
        }

        return colour;
      }),
    }));

    setTimeout(() => {
      setState((previous) => ({
        ...previous,
        colours: previous.colours.map((colour) => {
          if (colour.name === colourToActivate) {
            return { ...colour, tint: colourMap[colour.name] };
          }

          return colour;
        }),
      }));
    }, 500);
  };

  const animateSequence = (newSequence: string[]) => {
    setState((previous) => ({ ...previous, loading: true }));

    newSequence.forEach((colour, index) => {
      setTimeout(() => {
        activateColour(colour);
      }, (index + 1) * 800);
    });

    setState((previous) => ({ ...previous, loading: false }));
  };

  useEffect(() => {
    if (state.gameState === "play") {
      if (state.humanSequence.length === state.sequence.length) {
        if (state.humanSequence.join("") === state.sequence.join("")) {
          if (state.level < maxLevel) {
            setState((previous) => ({
              ...previous,
              level: state.level + 1,
              humanSequence: [],
            }));

            const nextColour = nextLevel();

            animateSequence([...state.sequence, nextColour]);
          } else {
            setState((previous) => ({ ...previous, gameState: "win" }));
          }
        } else {
          setState((previous) => ({ ...previous, gameState: "lose" }));
        }
      }
    }
  }, [state.gameState]);

  if (state.gameState === "lobby") {
    return (
      <Detail
        markdown="Press Start Game to start playing!"
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Start Game"
              onSubmit={() => {
                setState((previous) => ({ ...previous, gameState: "play" }));

                const nextColour = nextLevel();

                activateColour(nextColour);

                animateSequence(state.sequence);
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (state.gameState === "win" || state.gameState === "lose") {
    return (
      <Detail
        markdown={state.gameState === "win" ? "You won, congratulations!" : "You lost, better luck next time!"}
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Play Again"
              onSubmit={() => {
                // TODO: make it start the game fresh
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Grid itemSize={Grid.ItemSize.Medium} inset={Grid.Inset.Small} isLoading={state.loading}>
      {state.colours.map((colour, index) => (
        <Grid.Item
          key={colour.name}
          content={{ value: { source: Icon.Circle, tintColor: colour.tint }, tooltip: colour.name }}
          title={colour.name}
          actions={
            <ActionPanel>
              <Action.SubmitForm
                title="Select"
                onSubmit={() => {
                  if (state.loading) {
                    return;
                  }

                  setState((previous) => ({
                    ...previous,
                    humanSequence: [...previous.humanSequence, colour.name],
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
