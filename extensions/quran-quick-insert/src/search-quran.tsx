import { Action, ActionPanel, getPreferenceValues, List } from "@raycast/api";
import { useMemo, useState } from "react";
import { AyahActionSections } from "./actions";
import {
  Ayah,
  ayah_subtitle,
  ayah_title,
  ayahs_in_range,
  ayahs_in_surah,
  Cursor,
  format_reference,
  parse_reference,
  search_ayahs,
  search_surahs,
  Surah,
} from "./quran";

type Mode = "ayah" | "surah";
type SetCursor = (cursor?: Cursor) => void;

export default function Command() {
  const [query, set_query] = useState("");
  const [mode, set_mode] = useState<Mode>("ayah");
  const [range_start, set_range_start] = useState<Cursor>();
  const [range_end, set_range_end] = useState<Cursor>();
  const preferences = useMemo(
    () => getPreferenceValues<Preferences.SearchQuran>(),
    [],
  );
  const clear_range = () => {
    set_range_start(undefined);
    set_range_end(undefined);
  };

  const ayahs = useMemo(() => {
    if (mode === "surah") return [];
    const parsed = parse_reference(query);
    if (parsed) return ayahs_in_range(parsed.start_cursor, parsed.end_cursor);
    return search_ayahs(query, preferences);
  }, [mode, preferences, query]);

  const surahs = useMemo(
    () => (mode === "surah" ? search_surahs(query) : []),
    [mode, query],
  );
  const selected_ayahs = useMemo(() => {
    if (!range_start && !range_end) return [];
    return ayahs_in_range(range_start || range_end!, range_end || range_start!);
  }, [range_start, range_end]);

  return (
    <List
      filtering={false}
      onSearchTextChange={set_query}
      searchBarAccessory={<ModeDropdown mode={mode} set_mode={set_mode} />}
      searchBarPlaceholder={
        mode === "surah" ? "Search surahs" : "Search Quran or enter 2:255"
      }
      throttle
    >
      {!!selected_ayahs.length && (
        <List.Section title={range_end ? "Selected Range" : "Selected Start"}>
          <List.Item
            title={range_title(selected_ayahs)}
            subtitle={format_reference(
              selected_ayahs[0],
              selected_ayahs[selected_ayahs.length - 1],
              "arabic",
            )}
            accessories={[{ text: `${selected_ayahs.length} ayah(s)` }]}
            actions={
              <ActionPanel>
                <SelectedRangeActionSections
                  ayahs={selected_ayahs}
                  clear_range={clear_range}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {mode === "surah" ? (
        <List.Section title="Surahs">
          {surahs.map((surah) => (
            <List.Item
              key={surah.number}
              title={surah.name}
              subtitle={`${surah.number}`}
              accessories={[{ text: `${surah.ayah_count} ayahs` }]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Open Surah"
                    target={
                      <SurahPicker
                        surah={surah}
                        range_start={range_start}
                        range_end={range_end}
                        set_range_start={set_range_start}
                        set_range_end={set_range_end}
                        clear_range={clear_range}
                      />
                    }
                  />
                  <AyahActionSections ayahs={ayahs_in_surah(surah.number)} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : (
        <List.Section title="Ayahs">
          {ayahs.map((ayah) => (
            <AyahItem
              key={ayah.ayah_id}
              ayah={ayah}
              range_start={range_start}
              range_end={range_end}
              set_range_start={set_range_start}
              set_range_end={set_range_end}
              clear_range={clear_range}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function ModeDropdown({
  mode,
  set_mode,
}: {
  mode: Mode;
  set_mode: (mode: Mode) => void;
}) {
  return (
    <List.Dropdown
      tooltip="Picker Mode"
      value={mode}
      onChange={(value) => set_mode(value as Mode)}
    >
      <List.Dropdown.Item title="Ayahs" value="ayah" />
      <List.Dropdown.Item title="Surahs" value="surah" />
    </List.Dropdown>
  );
}

function SurahPicker({
  surah,
  range_start,
  range_end,
  set_range_start,
  set_range_end,
  clear_range,
}: {
  surah: Surah;
  range_start?: Cursor;
  range_end?: Cursor;
  set_range_start: SetCursor;
  set_range_end: SetCursor;
  clear_range: () => void;
}) {
  return (
    <List
      navigationTitle={surah.name}
      searchBarPlaceholder={`Search ${surah.name}`}
    >
      {ayahs_in_surah(surah.number).map((ayah) => (
        <AyahItem
          key={ayah.ayah_id}
          ayah={ayah}
          range_start={range_start}
          range_end={range_end}
          set_range_start={set_range_start}
          set_range_end={set_range_end}
          clear_range={clear_range}
        />
      ))}
    </List>
  );
}

function AyahItem({
  ayah,
  range_start,
  range_end,
  set_range_start,
  set_range_end,
  clear_range,
}: {
  ayah: Ayah;
  range_start?: Cursor;
  range_end?: Cursor;
  set_range_start: SetCursor;
  set_range_end: SetCursor;
  clear_range: () => void;
}) {
  const selected_ayahs =
    range_start || range_end
      ? ayahs_in_range(range_start || range_end!, range_end || range_start!)
      : [];

  return (
    <List.Item
      title={ayah_title(ayah, "imlai")}
      subtitle={ayah_subtitle(ayah)}
      accessories={[{ text: `${ayah.surah_number}:${ayah.ayah_number}` }]}
      actions={
        <ActionPanel>
          <AyahActionSections ayahs={[ayah]} />
          <ActionPanel.Section title="Picker">
            {range_start && !range_end ? (
              <>
                <Action
                  title="Set as Range End"
                  onAction={() => set_range_end(ayah)}
                />
                <Action
                  title="Set as Range Start"
                  onAction={() => set_range_start(ayah)}
                />
              </>
            ) : (
              <>
                <Action
                  title="Set as Range Start"
                  onAction={() => set_range_start(ayah)}
                />
                <Action
                  title="Set as Range End"
                  onAction={() => set_range_end(ayah)}
                />
              </>
            )}
            {!!selected_ayahs.length && (
              <Action title="Clear Range" onAction={clear_range} />
            )}
          </ActionPanel.Section>
          {!!selected_ayahs.length && (
            <SelectedRangeActionSections
              ayahs={selected_ayahs}
              clear_range={clear_range}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

function SelectedRangeActionSections({
  ayahs,
  clear_range,
}: {
  ayahs: Ayah[];
  clear_range: () => void;
}) {
  return (
    <>
      <AyahActionSections
        ayahs={ayahs}
        copy_title="Copy Selected Range"
        paste_title="Paste Selected Range"
      />
      <ActionPanel.Section title="Range">
        <Action title="Clear Range" onAction={clear_range} />
      </ActionPanel.Section>
    </>
  );
}

function range_title(ayahs: Ayah[]) {
  const first = ayahs[0];
  const last = ayahs[ayahs.length - 1];
  if (first.ayah_id === last.ayah_id) return ayah_subtitle(first);
  return `${ayah_subtitle(first)} - ${ayah_subtitle(last)}`;
}
