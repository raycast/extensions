import { Action, ActionPanel, Color, Icon, Keyboard, List, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import {
  getMix,
  isCached,
  pause,
  percent,
  play,
  playingCount,
  resume,
  setMaster,
  setVolume,
  stepVolume,
  stop,
  stopAll,
  VOLUMES,
} from "./player";
import { PresetNameForm } from "./preset-form";
import { savePreset } from "./presets";
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

const pauseShortcut: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd", "shift"], key: "p" },
  Windows: { modifiers: ["ctrl", "shift"], key: "p" },
};

const masterVolumeShortcut: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd"], key: "m" },
  Windows: { modifiers: ["ctrl"], key: "m" },
};

export default function Command() {
  const { data: mix, isLoading, revalidate } = usePromise(async () => getMix());
  const { push } = useNavigation();
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

  const sounds = mix?.sounds ?? {};
  const master = mix?.master ?? 1;
  const inMix = Object.keys(sounds).length;
  const playing = mix ? playingCount(mix) : 0;
  const visible = categories.filter((c) => filter === "all" || filter === "in-mix" || c.id === filter);

  let navigationTitle = "Moodist";
  if (playing) navigationTitle += ` — ${playing} playing`;
  else if (inMix) navigationTitle += ` — ${inMix} paused`;
  if (inMix && master < 1) navigationTitle += ` · Master ${percent(master)}`;

  const mixActions = inMix > 0 && (
    <ActionPanel.Section title="Mix">
      {playing > 0 ? (
        <Action
          title="Pause Mix"
          icon={Icon.Pause}
          shortcut={pauseShortcut}
          onAction={() => run("*", "Pausing", pause)}
        />
      ) : (
        <Action
          title="Resume Mix"
          icon={Icon.Play}
          shortcut={pauseShortcut}
          onAction={() => run("*", "Resuming", resume)}
        />
      )}
      <ActionPanel.Submenu title="Master Volume" icon={Icon.SpeakerHigh} shortcut={masterVolumeShortcut}>
        {VOLUMES.map((v) => (
          <Action
            key={v}
            title={percent(v)}
            icon={v === master ? Icon.Checkmark : undefined}
            onAction={() => run("*", `Master ${percent(v)}`, () => setMaster(v))}
          />
        ))}
      </ActionPanel.Submenu>
      <Action
        title="Save Mix as Preset"
        icon={Icon.SaveDocument}
        shortcut={Keyboard.Shortcut.Common.Save}
        onAction={() =>
          push(
            <PresetNameForm
              title="Save Preset"
              onSubmit={async (name) => {
                await savePreset(name, getMix());
                await showToast({ style: Toast.Style.Success, title: `Saved "${name}"` });
              }}
            />,
          )
        }
      />
      <Action
        title="Stop All"
        icon={Icon.StopFilled}
        style={Action.Style.Destructive}
        shortcut={Keyboard.Shortcut.Common.RemoveAll}
        onAction={() => run("*", "Stopping all", stopAll)}
      />
    </ActionPanel.Section>
  );

  function item(sound: Sound) {
    const entry = sounds[sound.id];
    const isPlaying = !!entry?.pid;
    const color = isPlaying ? Color.Green : Color.Orange;
    let icon: List.Item.Props["icon"] = { source: Icon.Play, tintColor: Color.SecondaryText };
    if (busy === sound.id) icon = Icon.CircleProgress;
    else if (isPlaying) icon = { source: Icon.SpeakerHigh, tintColor: Color.Green };
    else if (entry) icon = { source: Icon.Pause, tintColor: Color.Orange };

    return (
      <List.Item
        key={sound.id}
        title={sound.label}
        icon={icon}
        keywords={[sound.id]}
        accessories={[
          ...(entry
            ? [{ tag: { value: percent(entry.volume), color }, tooltip: isPlaying ? "Playing" : "Paused" }]
            : []),
          ...(!isCached(sound) ? [{ icon: Icon.Download, tooltip: "Downloads on first play" }] : []),
        ]}
        actions={
          <ActionPanel>
            {isPlaying ? (
              <Action
                title="Stop"
                icon={Icon.Stop}
                onAction={() => run(sound.id, `Stopping ${sound.label}`, () => stop(sound.id))}
              />
            ) : (
              <Action
                title={entry ? "Resume" : "Play"}
                icon={Icon.Play}
                onAction={() => run(sound.id, `Starting ${sound.label}`, () => play(sound.id))}
              />
            )}
            {entry && !isPlaying && (
              <Action
                title="Remove from Mix"
                icon={Icon.Minus}
                onAction={() => run(sound.id, `Removing ${sound.label}`, () => stop(sound.id))}
              />
            )}
            {entry && (
              <ActionPanel.Section>
                <Action
                  title="Decrease Volume"
                  icon={Icon.SpeakerDown}
                  shortcut={decreaseVolumeShortcut}
                  onAction={() => {
                    const next = stepVolume(entry.volume, -1);
                    if (next !== entry.volume)
                      run(sound.id, `Volume ${percent(next)}`, () => setVolume(sound.id, next));
                  }}
                />
                <Action
                  title="Increase Volume"
                  icon={Icon.SpeakerUp}
                  shortcut={increaseVolumeShortcut}
                  onAction={() => {
                    const next = stepVolume(entry.volume, 1);
                    if (next !== entry.volume)
                      run(sound.id, `Volume ${percent(next)}`, () => setVolume(sound.id, next));
                  }}
                />
                <ActionPanel.Submenu title="Set Volume" icon={Icon.SpeakerOn} shortcut={setVolumeShortcut}>
                  {VOLUMES.map((v) => (
                    <Action
                      key={v}
                      title={percent(v)}
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
                  await play(sound.id, entry?.volume);
                })
              }
            />
            {mixActions}
            <Action.OpenInBrowser title="Open Moodist Website" url="https://moodist.mvze.net" />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading || !!busy}
      navigationTitle={navigationTitle}
      searchBarPlaceholder="Search sounds…"
      searchBarAccessory={
        <List.Dropdown tooltip="Category" value={filter} onChange={setFilter}>
          <List.Dropdown.Item title="All Sounds" value="all" />
          <List.Dropdown.Item title="In Mix" value="in-mix" icon={Icon.SpeakerHigh} />
          <List.Dropdown.Section>
            {categories.map((c) => (
              <List.Dropdown.Item key={c.id} title={c.title} value={c.id} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {filter === "in-mix" && inMix === 0 && (
        <List.EmptyView
          icon={Icon.SpeakerOff}
          title="Nothing in the mix"
          description="Pick a sound to start your mix."
        />
      )}
      {visible.map((c) => {
        const list = filter === "in-mix" ? c.sounds.filter((s) => sounds[s.id]) : c.sounds;
        if (!list.length) return null;
        return (
          <List.Section key={c.id} title={c.title}>
            {list.map(item)}
          </List.Section>
        );
      })}
    </List>
  );
}
