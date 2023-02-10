import { Action, ActionPanel, Detail, showToast, Toast, Keyboard, Clipboard, showHUD, popToRoot } from "@raycast/api";

import { ChordBox } from "chordbox";
import { ChordBoxChord } from "./types";
import { ChordsDBChordBoxifier } from "./utils";

const ChordsVisualizer = function (props: { chordKey: string; chordSuffix: string }) {
  const { chordKey, chordSuffix } = props;

  let anErrorOccured = false;
  let chordBoxPositions: ChordBoxChord[] = [];

  const chordsDbChordBoxifier = new ChordsDBChordBoxifier();

  try {
    chordBoxPositions = chordsDbChordBoxifier
      .setQuery({
        key: chordKey,
        suffix: chordSuffix,
      })
      .getPositions();
  } catch (e) {
    showToast({
      title: "ChordBox",
      message: "No chord matching that key/suffix was found",
      style: Toast.Style.Failure,
    });
    anErrorOccured = true;
  }

  const chordBoxPositionsMarkdown = chordBoxPositions
    .map((position) => {
      return `![Image](${new ChordBox(position).render().toSVGBase64URI()})`;
    })
    .join("\r\n");

  const chordBoxPositionsSVG = (positionIndex: number) =>
    chordBoxPositions.map((position) => {
      return new ChordBox(position).render().toSVG();
    })[positionIndex];

  const copyChordPositionToClipboard = (positionIndex: number) => {
    Clipboard.copy(chordBoxPositionsSVG(positionIndex));
    showHUD(`Position ${positionIndex + 1} copied!`);
    popToRoot({ clearSearchBar: true });
  };

  const errorMarkdown = [
    "# Guitar Chords: Chord Not Found",
    "## No chord matching that key/suffix was found",
    "Try again using a valid `key` and `suffix`, e.g:",
    "- **key**: `C`  , **suffix**: `major`",
    "- **key**: `D`  , **suffix**: `dim7`",
    "- **key**: `F#`, **suffix**: `7b5`",
  ].join("\r\n");

  return anErrorOccured ? (
    <Detail markdown={errorMarkdown} />
  ) : (
    <Detail
      markdown={chordBoxPositionsMarkdown}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Copy SVG">
            {chordBoxPositions.map((_, positionIndex) => (
              <Action
                key={positionIndex}
                title={`Copy Position ${positionIndex + 1}`}
                shortcut={{ modifiers: ["cmd"], key: (positionIndex + 1).toString() as Keyboard.KeyEquivalent }}
                onAction={() => copyChordPositionToClipboard(positionIndex)}
              />
            ))}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};

export { ChordsVisualizer };
