import { useEffect, useState } from "react";
import { ActionPanel, Action, Icon, Grid, Color } from "@raycast/api";

export default function Command() {
  const [loading, setLoading] = useState(false);
  const [gameState, setGameState] = useState("start");
  const [level, setLevel] = useState(0);
  const [sequence, setSequence] = useState([] as string[]);
  const [humanSequence, setHumanSequence] = useState([] as string[]);
  const [colours, setColours] = useState([
    { name: "Red", tint: Color.Red },
    { name: "Blue", tint: Color.Blue },
    { name: "Green", tint: Color.Green },
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
    let tint = Color.PrimaryText;

    setColours((colours) =>
      colours.map((colour) => {
        if (colour.name === colourToActivate) {
          tint = colour.tint;

          return { ...colour, tint: Color.PrimaryText };
        }

        return colour;
      })
    );

    setTimeout(() => {
      setColours((colours) =>
        colours.map((colour) => {
          if (colour.name === colourToActivate) {
            return { ...colour, tint: tint };
          }

          return colour;
        })
      );
    }, 500);
  };

  useEffect(() => {
    if (gameState === "start") {
      const nextColour = nextLevel();

      setGameState("play");

      activateColour(nextColour);
    }

    if (gameState === "play") {
      if (humanSequence.length === sequence.length) {
        if (humanSequence.join("") === sequence.join("")) {
          console.log("success");

          if (level < maxLevel) {
            setLevel(level + 1);
            nextLevel();

            sequence.forEach((colour, index) => {
              setTimeout(() => {
                activateColour(colour);
              }, (index + 1) * 500);
            });
          }
        } else {
          console.log("fail");
        }
      }
    }

    console.log(sequence, humanSequence);
  }, [sequence, humanSequence]);

  return (
    <Grid itemSize={Grid.ItemSize.Medium} inset={Grid.Inset.Medium} isLoading={sequence.length <= 0}>
      {sequence.length > 0 &&
        colours.map((colour, index) => (
          <Grid.Item
            key={colour.name}
            content={{ value: { source: Icon.Circle, tintColor: colour.tint }, tooltip: colour.name }}
            title={colour.name}
            actions={
              <ActionPanel>
                <Action.SubmitForm
                  title="Select"
                  onSubmit={(values) => {
                    if (loading) {
                      console.log("loading...");

                      return;
                    }

                    console.log(colour.name);

                    setHumanSequence([...humanSequence, colour.name]);
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
    </Grid>
  );
}
