import { List, ActionPanel, Action } from "@raycast/api";
import { useState, useEffect } from "react";

import { ChordsVisualizer } from "./chords-visualizer";
import { ChordsDBChords } from "./utils";

export default function Command() {
  const chordsDBChords = new ChordsDBChords();
  const chords = chordsDBChords.getChords();
  const keys = chordsDBChords.getKeys();

  const [searchText, setSearchText] = useState("");
  const [filteredList, filterList] = useState(chords);

  useEffect(() => {
    filterList(
      chords.filter((chord) => {
        return !searchText ? true : chord.key === searchText;
      })
    );
  }, [searchText]);

  return (
    <List
      searchBarPlaceholder="Search chords"
      searchBarAccessory={
        <List.Dropdown tooltip="Chord Key" onChange={setSearchText}>
          <List.Dropdown.Item title={`All (${chords.length})`} value="" />
          {keys.map((key, keyIndex) => (
            <List.Dropdown.Item
              key={keyIndex}
              title={`${key.sharpKey} (${chords.filter((c) => c.key === key.safeKey).length})`}
              value={key.safeKey}
            />
          ))}
        </List.Dropdown>
      }
    >
      {filteredList.map((chord, chordIndex) => (
        <List.Item
          key={chordIndex}
          title={chord.title}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Chord"
                target={<ChordsVisualizer chordKey={chord.key} chordSuffix={chord.suffix} />}
              />
            </ActionPanel>
          }
          accessories={[{ text: `${chord.positions.toString()} positions` }]}
        />
      ))}
    </List>
  );
}
