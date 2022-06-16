import { useEffect, useState } from "react";
import { ActionPanel, Action, Icon, Grid, Color, Detail } from "@raycast/api";

export default function Command() {
  const [loading, setLoading] = useState(false);
  const [gameState, setGameState] = useState("start");
  const [level, setLevel] = useState(0);
  const [sequence, setSequence] = useState([] as string[]);
  const [humanSequence, setHumanSequence] = useState([] as string[]);
  const colourMap = {
    Red: Color.Red,
    Green: Color.Green,
    Blue: Color.Blue,
    Yellow: Color.Yellow,
  } as { [key: string]: Color };
  const [colours, setColours] = useState([
    { name: "Red", tint: Color.Red },
    { name: "Green", tint: Color.Green },
    { name: "Blue", tint: Color.Blue },
    { name: "Yellow", tint: Color.Yellow },
  ]);

  const maxLevel = 20;

  const nextLevel = () => {
    const randomIndex = Math.floor(Math.random() * colours.length);
    const nextColour = colours[randomIndex].name;

    setSequence([...sequence, nextColour]);

    return nextColour;
  };

  const activateColour = (colourToActivate: string) => {
    setColours((colours) =>
      colours.map((colour) => {
        if (colour.name === colourToActivate) {
          return { ...colour, tint: Color.PrimaryText };
        }

        return colour;
      })
    );

    setTimeout(() => {
      setColours((colours) =>
        colours.map((colour) => {
          if (colour.name === colourToActivate) {
            return { ...colour, tint: colourMap[colour.name] };
          }

          return colour;
        })
      );
    }, 500);
  };

  const animateSequence = (newSequence: string[]) => {
    // newSequence.forEach((colour, index) => {
    ["Red", "Green", "Red", "Red"].forEach((colour, index) => {
      setTimeout(() => {
        activateColour(colour);
      }, (index + 1) * 800);
    });
  };

  useEffect(() => {
    if (gameState === "play") {
      if (humanSequence.length === sequence.length) {
        if (humanSequence.join("") === sequence.join("")) {
          console.log("success");

          if (level < maxLevel) {
            setLevel(level + 1);
            const nextColour = nextLevel();
            setHumanSequence([]);

            animateSequence([...sequence, nextColour]);
          }
        } else {
          console.log("fail");
        }
      }
    }

    console.log(sequence, humanSequence);
  }, [gameState, sequence, humanSequence]);

  if (gameState === "start") {
    return (
      <Detail
        markdown="Press on Start Game to start playing!"
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Start Game"
              onSubmit={(values) => {
                const nextColour = nextLevel();

                setGameState("play");

                activateColour(nextColour);

                animateSequence(sequence);
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Grid itemSize={Grid.ItemSize.Medium} inset={Grid.Inset.Medium} isLoading={loading}>
      {gameState === "play" &&
        colours.map((colour, index) => (
          <Grid.Item
            key={colour.name}
            content={{ value: { source: Icon.Circle, tintColor: colour.tint }, tooltip: colour.name }}
            title={colour.name}
            actions={
              <ActionPanel>
                {gameState === "play" && <Action.SubmitForm
                  title="Select"
                  onSubmit={(values) => {
                    if (loading) {
                      console.log("loading...");

                      return;
                    }

                    console.log(colour.name);

                    setHumanSequence([...humanSequence, colour.name]);
                  }}
                />}
              </ActionPanel>
            }
          />
        ))}
    </Grid>
  );
}
