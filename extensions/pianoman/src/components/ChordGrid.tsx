import { Action, ActionPanel, Grid, Icon } from "@raycast/api";
import { Chord } from "../libs/chord";
import ChordDetails, { getChordImageUrl } from "./ChordDetails";
import { Note } from "../libs/note";
import { ChordError } from "./ChordError";

type ChordGridProps = {
  rootNote?: Note;
  chords: Chord[];
  isLoading?: boolean;
};

/**
 * Show the grid of chords from single key
 */
export default function ChordGrid({ rootNote, chords, isLoading = false }: ChordGridProps) {
  if (!rootNote) {
    return <ChordError />;
  }

  // Create a grid of chords, based on the selected note
  const gridItems = chords.map((chordData, index) => {
    const chordImageData = getChordImageUrl({ chord: chordData });
    // When selected, show chord details from single chord
    return (
      <Grid.Item
        key={index}
        actions={
          <ActionPanel>
            <Action.Push
              title="Open Chord Details"
              icon={Icon.AppWindowSidebarRight}
              target={<ChordDetails chord={chordData} />}
            />
          </ActionPanel>
        }
        content={chordImageData}
        title={chordData.fullName}
        subtitle={chordData.alias.join(", ")}
      />
    );
  });

  return (
    <Grid
      isLoading={isLoading}
      enableFiltering={true}
      searchBarPlaceholder="Filter chords by names"
      navigationTitle="Search Chords"
      itemSize={Grid.ItemSize.Large}
    >
      <Grid.Section title={rootNote.getChromaticName()}>{gridItems}</Grid.Section>
    </Grid>
  );
}
