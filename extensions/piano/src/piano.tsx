import { Action, ActionPanel, Color, Detail, Icon, Keyboard } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { playNote, stopAllNotes } from "./audio";

type PianoKey = {
  key: Keyboard.KeyEquivalent;
  semitone: number;
  name: string;
  accidental: boolean;
};

const PIANO_KEYS: PianoKey[] = [
  { key: "a", semitone: 0, name: "C", accidental: false },
  { key: "w", semitone: 1, name: "C♯", accidental: true },
  { key: "s", semitone: 2, name: "D", accidental: false },
  { key: "e", semitone: 3, name: "D♯", accidental: true },
  { key: "d", semitone: 4, name: "E", accidental: false },
  { key: "f", semitone: 5, name: "F", accidental: false },
  { key: "t", semitone: 6, name: "F♯", accidental: true },
  { key: "g", semitone: 7, name: "G", accidental: false },
  { key: "y", semitone: 8, name: "G♯", accidental: true },
  { key: "h", semitone: 9, name: "A", accidental: false },
  { key: "u", semitone: 10, name: "A♯", accidental: true },
  { key: "j", semitone: 11, name: "B", accidental: false },
  { key: "k", semitone: 12, name: "C", accidental: false },
];

const MIN_OCTAVE = 2;
const MAX_OCTAVE = 6;

function noteLabel(note: PianoKey, octave: number): string {
  return `${note.name}${octave + (note.semitone === 12 ? 1 : 0)}`;
}

export default function Piano() {
  const [octave, setOctave] = useState(4);
  const [sustain, setSustain] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [lastNote, setLastNote] = useState<string>("—");
  const noteTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (noteTimer.current) clearTimeout(noteTimer.current);
      stopAllNotes();
    };
  }, []);

  function triggerNote(note: PianoKey): void {
    const midi = 12 * (octave + 1) + note.semitone;
    const label = noteLabel(note, octave);
    playNote(midi, sustain, volume);
    setLastNote(label);
    if (noteTimer.current) clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => setLastNote("—"), 700);
  }

  function shiftOctave(amount: number): void {
    setOctave((current) => Math.max(MIN_OCTAVE, Math.min(MAX_OCTAVE, current + amount)));
  }

  function changeVolume(amount: number): void {
    setVolume((current) => Math.max(0.2, Math.min(1, Math.round((current + amount) * 10) / 10)));
  }

  const markdown = `![Playable piano](piano.svg?raycast-width=720)

## ${lastNote === "—" ? "Ready when you are" : `Now playing · ${lastNote}`}

\`A W S E D F T G Y H U J K\`

Play the white and black keys directly from your keyboard. Open the action panel to click notes with the mouse.`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Octave" text={String(octave)} icon={Icon.Music} />
          <Detail.Metadata.Label title="Last Note" text={lastNote} />
          <Detail.Metadata.TagList title="Pedal">
            <Detail.Metadata.TagList.Item
              text={sustain ? "Sustain On" : "Sustain Off"}
              color={sustain ? Color.Green : Color.SecondaryText}
              onAction={() => setSustain((current) => !current)}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Volume" text={`${Math.round(volume * 100)}%`} icon={Icon.SpeakerHigh} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Keyboard" text="A → K" />
          <Detail.Metadata.Label title="Octave" text="←  →" />
          <Detail.Metadata.Label title="Sustain" text="Space" />
          <Detail.Metadata.Label title="Volume" text="⇧ ↑  ⇧ ↓" />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Play">
            {PIANO_KEYS.map((note) => (
              <Action
                key={`${note.key}-${note.semitone}`}
                title={`Play ${noteLabel(note, octave)}`}
                icon={note.accidental ? Icon.CircleFilled : Icon.Circle}
                shortcut={{ modifiers: [], key: note.key }}
                onAction={() => triggerNote(note)}
              />
            ))}
          </ActionPanel.Section>
          <ActionPanel.Section title="Piano">
            <Action
              title={sustain ? "Release Sustain Pedal" : "Press Sustain Pedal"}
              icon={sustain ? Icon.Pause : Icon.Play}
              shortcut={{ modifiers: [], key: "space" }}
              onAction={() => setSustain((current) => !current)}
            />
            <Action
              title="Octave Down"
              icon={Icon.ArrowLeft}
              shortcut={{ modifiers: [], key: "arrowLeft" }}
              onAction={() => shiftOctave(-1)}
            />
            <Action
              title="Increase Octave"
              icon={Icon.ArrowRight}
              shortcut={{ modifiers: [], key: "arrowRight" }}
              onAction={() => shiftOctave(1)}
            />
            <Action
              title="Increase Volume"
              icon={Icon.SpeakerHigh}
              shortcut={{ modifiers: ["shift"], key: "arrowUp" }}
              onAction={() => changeVolume(0.1)}
            />
            <Action
              title="Volume Down"
              icon={Icon.SpeakerOff}
              shortcut={{ modifiers: ["shift"], key: "arrowDown" }}
              onAction={() => changeVolume(-0.1)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
