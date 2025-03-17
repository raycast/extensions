import { Action, ActionPanel, Grid, useNavigation } from "@raycast/api";
import { useState } from "react";
import { DeckList } from "./components/deck-list";
import { ClassName } from "./types/types";
import { classIcon, getGameModeName } from "./utils/utils";

export default function Command() {
  const [format, setFormat] = useState(1);
  const [minGames, setMinGames] = useState<number>();
  const { push } = useNavigation();

  const classes = Object.values(ClassName);

  const handleFormatChange = (newValue: string) => {
    const [newFormat, newMinGames] = newValue.split("_");
    setFormat(Number(newFormat));
    setMinGames(newMinGames ? Number(newMinGames) : undefined);
  };

  return (
    <Grid
      columns={5} // Set the number of columns
      inset={Grid.Inset.Medium} // Use medium padding
      aspectRatio="1" // Make sure each element is a square
      fit={Grid.Fit.Fill} // Fill available space
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Select Format and Filters"
          onChange={handleFormatChange}
        >
          <Grid.Dropdown.Section title="Game Mode">
            <Grid.Dropdown.Item title="Wild" value="1" />
            <Grid.Dropdown.Item title="Standard" value="2" />
          </Grid.Dropdown.Section>
          <Grid.Dropdown.Section title="Minimum Games">
            {[50, 100, 200, 400, 800, 1600, 3200, 6400].map((games) => (
              <Grid.Dropdown.Item
                key={games}
                title={`${games}+`}
                value={`${format}_${games}`}
              />
            ))}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {classes.map((className) => (
        <Grid.Item
          key={className}
          content={{ source: classIcon(className).source, tintColor: null }}
          title={className}
          actions={
            <ActionPanel title={className}>
              <ActionPanel.Section>
                <Action
                  title={`View ${getGameModeName(format)} Decks`}
                  onAction={() =>
                    push(
                      <DeckList
                        className={className}
                        format={format}
                        minGames={minGames}
                      />,
                    )
                  }
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
