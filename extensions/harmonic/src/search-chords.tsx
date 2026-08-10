import { ActionPanel, Action, List, Icon, Color, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { resolveChord, getChordSuggestions, getAllChordDefinitions } from "./lib/chords";
import { playFrequencies, stopAll, type ToneType, type Duration } from "./lib/audio";

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

const OCTAVE_OPTIONS = [
  { title: "Octave 2 (Bass)", value: 2 },
  { title: "Octave 3 (Low)", value: 3 },
  { title: "Octave 4 (Middle, Default)", value: 4 },
  { title: "Octave 5 (High)", value: 5 },
  { title: "Octave 6 (Very High)", value: 6 },
];

const CATEGORY_COLORS: Record<string, Color> = {
  Triad: Color.Blue,
  Seventh: Color.Green,
  Sixth: Color.Magenta,
  Extended: Color.Orange,
  Altered: Color.Red,
  Jazz: Color.Purple,
  Lydian: Color.Yellow,
  Modal: Color.PrimaryText,
  Power: Color.SecondaryText,
};

export default function SearchChords() {
  const [searchText, setSearchText] = useState("");
  const [tone, setTone] = useState<ToneType>("warm");
  const [duration, setDuration] = useState<Duration>(2);
  const [octave, setOctave] = useState(4);

  const chord = searchText ? resolveChord(searchText, octave) : null;
  const suggestions = searchText ? getChordSuggestions(searchText) : [];

  // Group all chord definitions by category when no search
  const allDefs = getAllChordDefinitions();
  const categories = [...new Set(allDefs.map((d) => d.category))];

  return (
    <List
      searchBarPlaceholder='Search for a chord... (e.g. "Cmaj7", "Dm7b5", "F#7#11")'
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
      {chord ? (
        <>
          {/* Exact match */}
          <List.Section title={`${chord.fullName}`}>
            <List.Item
              title={chord.symbol}
              subtitle={chord.notes.map((n) => `${n.scientificName} (${n.frequency} Hz)`).join("  ·  ")}
              accessories={[
                {
                  tag: {
                    value: chord.category,
                    color: CATEGORY_COLORS[chord.category] || Color.PrimaryText,
                  },
                },
              ]}
              actions={
                <ChordActions
                  chord={chord}
                  tone={tone}
                  duration={duration}
                  octave={octave}
                  setDuration={setDuration}
                  setOctave={setOctave}
                />
              }
            />
          </List.Section>

          {/* Other suggestions */}
          {suggestions.filter((s) => s.symbol !== chord.symbol).length > 0 && (
            <List.Section title="Other Chords">
              {suggestions
                .filter((s) => s.symbol !== chord.symbol)
                .map((s) => (
                  <List.Item
                    key={s.symbol}
                    title={s.symbol}
                    subtitle={s.fullName}
                    accessories={[
                      {
                        tag: {
                          value: s.category,
                          color: CATEGORY_COLORS[s.category] || Color.PrimaryText,
                        },
                      },
                    ]}
                    actions={
                      <ActionPanel>
                        <Action
                          title="Select Chord"
                          icon={Icon.MagnifyingGlass}
                          onAction={() => setSearchText(s.symbol)}
                        />
                      </ActionPanel>
                    }
                  />
                ))}
            </List.Section>
          )}
        </>
      ) : suggestions.length > 0 ? (
        <List.Section title="Suggestions">
          {suggestions.map((s) => (
            <List.Item
              key={s.symbol}
              title={s.symbol}
              subtitle={s.fullName}
              accessories={[
                {
                  tag: {
                    value: s.category,
                    color: CATEGORY_COLORS[s.category] || Color.PrimaryText,
                  },
                },
              ]}
              actions={
                <ActionPanel>
                  <Action title="Select Chord" icon={Icon.MagnifyingGlass} onAction={() => setSearchText(s.symbol)} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : (
        <>
          {searchText && (
            <List.Section title="No Match">
              <List.Item title="No chord found" subtitle='Try something like "Cmaj7" or "Dm"' />
            </List.Section>
          )}
          {!searchText &&
            categories.map((cat) => (
              <List.Section key={cat} title={cat}>
                {allDefs
                  .filter((d) => d.category === cat)
                  .map((d) => (
                    <List.Item
                      key={d.symbol || "major"}
                      title={`C${d.symbol}`}
                      subtitle={d.name}
                      accessories={[
                        {
                          tag: {
                            value: cat,
                            color: CATEGORY_COLORS[cat] || Color.PrimaryText,
                          },
                        },
                        ...(d.aliases ? [{ text: d.aliases.join(", ") }] : []),
                      ]}
                      actions={
                        <ActionPanel>
                          <Action
                            title="Select Chord"
                            icon={Icon.MagnifyingGlass}
                            onAction={() => setSearchText(`C${d.symbol}`)}
                          />
                        </ActionPanel>
                      }
                    />
                  ))}
              </List.Section>
            ))}
        </>
      )}
    </List>
  );
}

function ChordActions({
  chord,
  tone,
  duration,
  octave,
  setDuration,
  setOctave,
}: {
  chord: NonNullable<ReturnType<typeof resolveChord>>;
  tone: ToneType;
  duration: Duration;
  octave: number;
  setDuration: (d: Duration) => void;
  setOctave: (o: number) => void;
}) {
  const frequencies = chord.notes.map((n) => n.frequency);
  const noteNames = chord.notes.map((n) => n.scientificName).join(" ");

  return (
    <ActionPanel>
      <ActionPanel.Section title="Play">
        <Action
          title="Play Chord"
          icon={Icon.Play}
          onAction={() => {
            playFrequencies(frequencies, duration, tone);
            showToast({
              style: Toast.Style.Success,
              title: `Playing ${chord.symbol}`,
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
              playFrequencies(frequencies, opt.value, tone);
              showToast({
                style: Toast.Style.Success,
                title: `Playing ${chord.symbol} for ${opt.title}`,
              });
            }}
          />
        ))}
      </ActionPanel.Section>
      <ActionPanel.Section title="Octave">
        {OCTAVE_OPTIONS.map((opt) => (
          <Action
            key={opt.value}
            title={opt.value === octave ? `${opt.title} ✓` : opt.title}
            icon={Icon.ArrowUp}
            onAction={() => {
              setOctave(opt.value);
              showToast({
                style: Toast.Style.Success,
                title: `Octave: ${opt.value}`,
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
          title="Copy Chord Notes"
          content={noteNames}
          shortcut={{ modifiers: ["cmd"], key: "c" }}
        />
        <Action.CopyToClipboard
          title="Copy Frequencies"
          content={frequencies.map((f) => `${f} Hz`).join(", ")}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
