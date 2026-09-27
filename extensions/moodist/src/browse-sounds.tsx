import { Action, ActionPanel, Color, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { getPlaying, isCached, play, setVolume, stepVolume, stop, stopAll, VOLUMES } from "./player";
import { categories, Sound } from "./sounds";

const decreaseVolumeShortcut: Keyboard.Shortcut = {
  macOS: { modifiers: ["opt"], key: "arrowLeft" },
  Windows: { modifiers: ["alt"], key: "arrowLeft" },
};

const increaseVolumeShortcut: Keyboard.Shortcut = {
  macOS: { modifiers: ["opt"], key: "arrowRight" },
  Windows: { modifiers: ["alt"], key: "arrowRight" },
};

const setVolumeShortcut: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd"], key: "v" },
  Windows: { modifiers: ["ctrl"], key: "v" },
};

export default function Command() {
  const { data: playing = {}, isLoading, revalidate } = usePromise(async () => getPlaying());
  const [busy, setBusy] = useState<string>();
  const busyRef = useRef(false);
  const [filter, setFilter] = useState("all");

  async function run(id: string, title: string, fn: () => unknown) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(id);
    const toast = await showToast({ style: Toast.Style.Animated, title });
    try {
      await fn();
      toast.hide();
    } catch (e) {
      toast.hide();
      await showFailureToast(e, { title: "Moodist" });
    } finally {
      busyRef.current = false;
      setBusy(undefined);
      revalidate();
    }
  }

  const playingCount = Object.keys(playing).length;
  const visible = categories.filter((c) => filter === "all" || (filter === "playing" ? true : c.id === filter));

  function item(sound: Sound) {
    const entry = playing[sound.id];
    const on = !!entry;
    return (
      <List.Item
        key={sound.id}
        title={sound.label}
        icon={
          busy === sound.id
            ? Icon.CircleProgress
            : on
              ? { source: Icon.SpeakerHigh, tintColor: Color.Green }
              : { source: Icon.Play, tintColor: Color.SecondaryText }
        }
        keywords={[sound.id]}
        accessories={[
          ...(on ? [{ tag: { value: `${Math.round(entry.volume * 100)}%`, color: Color.Green } }] : []),
          ...(!isCached(sound) ? [{ icon: Icon.Download, tooltip: "Downloads on first play" }] : []),
        ]}
        actions={
          <ActionPanel>
            {on ? (
              <Action
                title="Stop"
                icon={Icon.Stop}
                onAction={() => run(sound.id, `Stopping ${sound.label}`, () => stop(sound.id))}
              />
            ) : (
              <Action
                title="Play"
                icon={Icon.Play}
                onAction={() => run(sound.id, `Starting ${sound.label}`, () => play(sound.id))}
              />
            )}
            {on && (
              <ActionPanel.Section>
                <Action
                  title="Decrease Volume"
                  icon={Icon.SpeakerDown}
                  shortcut={decreaseVolumeShortcut}
                  onAction={() => {
                    const next = stepVolume(entry.volume, -1);
                    if (next !== entry.volume)
                      run(sound.id, `Volume ${Math.round(next * 100)}%`, () => setVolume(sound.id, next));
                  }}
                />
                <Action
                  title="Increase Volume"
                  icon={Icon.SpeakerUp}
                  shortcut={increaseVolumeShortcut}
                  onAction={() => {
                    const next = stepVolume(entry.volume, 1);
                    if (next !== entry.volume)
                      run(sound.id, `Volume ${Math.round(next * 100)}%`, () => setVolume(sound.id, next));
                  }}
                />
                <ActionPanel.Submenu title="Set Volume" icon={Icon.SpeakerOn} shortcut={setVolumeShortcut}>
                  {VOLUMES.map((v) => (
                    <Action
                      key={v}
                      title={`${Math.round(v * 100)}%`}
                      icon={v === entry.volume ? Icon.Checkmark : undefined}
                      onAction={() => run(sound.id, "Adjusting volume", () => setVolume(sound.id, v))}
                    />
                  ))}
                </ActionPanel.Submenu>
              </ActionPanel.Section>
            )}
            <Action
              title="Play Only This"
              icon={Icon.Music}
              shortcut={Keyboard.Shortcut.Common.Open}
              onAction={() =>
                run(sound.id, `Playing ${sound.label}`, async () => {
                  stopAll();
                  await play(sound.id);
                })
              }
            />
            {playingCount > 0 && (
              <Action
                title="Stop All"
                icon={Icon.StopFilled}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Duplicate}
                onAction={() => run("*", "Stopping all", stopAll)}
              />
            )}
            <Action.OpenInBrowser title="Open Moodist Website" url="https://moodist.mvze.net" />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading || !!busy}
      navigationTitle={playingCount ? `Moodist — ${playingCount} playing` : "Moodist"}
      searchBarPlaceholder="Search sounds…"
      searchBarAccessory={
        <List.Dropdown tooltip="Category" value={filter} onChange={setFilter}>
          <List.Dropdown.Item title="All Sounds" value="all" />
          <List.Dropdown.Item title="Playing" value="playing" icon={Icon.SpeakerHigh} />
          <List.Dropdown.Section>
            {categories.map((c) => (
              <List.Dropdown.Item key={c.id} title={c.title} value={c.id} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {filter === "playing" && playingCount === 0 && (
        <List.EmptyView icon={Icon.SpeakerOff} title="Nothing playing" description="Pick a sound to start your mix." />
      )}
      {visible.map((c) => {
        const sounds = filter === "playing" ? c.sounds.filter((s) => playing[s.id]) : c.sounds;
        if (!sounds.length) return null;
        return (
          <List.Section key={c.id} title={c.title}>
            {sounds.map(item)}
          </List.Section>
        );
      })}
    </List>
  );
}
