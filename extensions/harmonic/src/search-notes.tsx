import { ActionPanel, Action, List, Icon, Color, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import {
  resolveNoteName,
  getAllOctaves,
  getOctaveLabel,
  getNotableLabel,
  getAllNoteNames,
  ENHARMONIC_DISPLAY,
} from "./lib/notes";
import { playFrequencies, stopAll, isPlaying, type ToneType, type Duration } from "./lib/audio";

const TONE_OPTIONS: { title: string; value: ToneType }[] = [
  { title: "Warm (Default)", value: "warm" },
  { title: "Pure Sine", value: "pure" },
  { title: "Bright", value: "bright" },
  { title: "Soft Decay", value: "soft" },
];

const DURATION_OPTIONS: { title: string; value: Duration }[] = [
  { title: "1 second", value: 1 },
  { title: "2 seconds (Default)", value: 2 },
  { title: "5 seconds", value: 5 },
  { title: "Infinite (until stopped)", value: 0 },
];

export default function SearchNotes() {
  const [searchText, setSearchText] = useState("");
  const [tone, setTone] = useState<ToneType>("warm");
  const [duration, setDuration] = useState<Duration>(2);

  // Try to resolve search text to a note name
  const resolvedNote = searchText ? resolveNoteName(searchText) : null;
  const octaves = resolvedNote ? getAllOctaves(resolvedNote) : [];

  // If no search, show all 12 notes as suggestions
  const allNotes = getAllNoteNames();

  return (
    <List
      searchBarPlaceholder='Search for a note... (e.g. "A flat", "C#", "Bb")'
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown tooltip="Tone" onChange={(val) => setTone(val as ToneType)}>
          {TONE_OPTIONS.map((opt) => (
            <List.Dropdown.Item key={opt.value} title={opt.title} value={opt.value} />
          ))}
        </List.Dropdown>
      }
    >
      {resolvedNote ? (
        <List.Section title={`${ENHARMONIC_DISPLAY[resolvedNote] || resolvedNote} — All Octaves`}>
          {octaves.map((note) => {
            const notable = getNotableLabel(note.name, note.octave);
            return (
              <List.Item
                key={note.scientificName}
                title={note.scientificName}
                subtitle={`${note.frequency} Hz`}
                accessories={[
                  ...(notable ? [{ tag: { value: notable, color: Color.Yellow } }] : []),
                  {
                    tag: {
                      value: getOctaveLabel(note.octave),
                      color: Color.Blue,
                    },
                  },
                  { text: `MIDI ${note.midiNumber}` },
                ]}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title="Play">
                      <Action
                        title="Play Note"
                        icon={Icon.Play}
                        onAction={() => {
                          playFrequencies([note.frequency], duration, tone);
                          showToast({
                            style: Toast.Style.Success,
                            title: `Playing ${note.scientificName} (${note.frequency} Hz)`,
                          });
                        }}
                      />
                      {DURATION_OPTIONS.map((opt) => (
                        <Action
                          key={opt.value}
                          title={`Play for ${opt.title}`}
                          icon={Icon.Clock}
                          shortcut={
                            opt.value === 1
                              ? { modifiers: ["cmd"], key: "1" }
                              : opt.value === 2
                                ? { modifiers: ["cmd"], key: "2" }
                                : opt.value === 5
                                  ? { modifiers: ["cmd"], key: "5" }
                                  : { modifiers: ["cmd"], key: "0" }
                          }
                          onAction={() => {
                            playFrequencies([note.frequency], opt.value, tone);
                            showToast({
                              style: Toast.Style.Success,
                              title: `Playing ${note.scientificName} for ${opt.title}`,
                            });
                          }}
                        />
                      ))}
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Settings">
                      <Action
                        title={`Duration: ${DURATION_OPTIONS.find((d) => d.value === duration)?.title}`}
                        icon={Icon.Clock}
                        onAction={() => {
                          const idx = DURATION_OPTIONS.findIndex((d) => d.value === duration);
                          const next = DURATION_OPTIONS[(idx + 1) % DURATION_OPTIONS.length];
                          setDuration(next.value);
                          showToast({
                            style: Toast.Style.Success,
                            title: `Duration: ${next.title}`,
                          });
                        }}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Control">
                      <Action
                        title="Stop All"
                        icon={Icon.Stop}
                        style={Action.Style.Destructive}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                        onAction={() => {
                          stopAll();
                          showToast({
                            style: Toast.Style.Success,
                            title: "Stopped all playback",
                          });
                        }}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Copy">
                      <Action.CopyToClipboard
                        title="Copy Frequency"
                        content={`${note.frequency} Hz`}
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                      />
                      <Action.CopyToClipboard
                        title="Copy Note Name"
                        content={note.scientificName}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ) : (
        <List.Section title={searchText ? "No match — try a note name" : "All Notes"}>
          {allNotes
            .filter(
              (n) =>
                !searchText ||
                n.toLowerCase().includes(searchText.toLowerCase()) ||
                (ENHARMONIC_DISPLAY[n] || "").toLowerCase().includes(searchText.toLowerCase()),
            )
            .map((noteName) => {
              const display = ENHARMONIC_DISPLAY[noteName] || noteName;
              return (
                <List.Item
                  key={noteName}
                  title={display}
                  subtitle="Type to see all octaves"
                  actions={
                    <ActionPanel>
                      <Action
                        title="Show Octaves"
                        icon={Icon.MagnifyingGlass}
                        onAction={() => setSearchText(noteName)}
                      />
                      {isPlaying() && (
                        <Action
                          title="Stop All"
                          icon={Icon.Stop}
                          style={Action.Style.Destructive}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                          onAction={() => {
                            stopAll();
                            showToast({
                              style: Toast.Style.Success,
                              title: "Stopped all playback",
                            });
                          }}
                        />
                      )}
                    </ActionPanel>
                  }
                />
              );
            })}
        </List.Section>
      )}
    </List>
  );
}
