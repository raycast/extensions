import { Action, ActionPanel, Color, Grid, Icon, Keyboard, List, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast, useCachedState, usePromise } from "@raycast/utils";
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
import { categoryIcons, soundIcons } from "./sound-icons";
import { categories, Sound } from "./sounds";

const decreaseVolumeShortcut: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd"], key: "-" },
  Windows: { modifiers: ["ctrl"], key: "-" },
};

const increaseVolumeShortcut: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd"], key: "=" },
  Windows: { modifiers: ["ctrl"], key: "=" },
};

const setVolumeShortcut: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd", "shift"], key: "v" },
  Windows: { modifiers: ["ctrl", "shift"], key: "v" },
};

const pauseShortcut: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd", "shift"], key: "p" },
  Windows: { modifiers: ["ctrl", "shift"], key: "p" },
};

const masterVolumeShortcut: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd"], key: "m" },
  Windows: { modifiers: ["ctrl"], key: "m" },
};

function ToggleLayoutAction({ layout, onToggleLayout }: { layout: string; onToggleLayout: () => void }) {
  return (
    <Action
      title="Toggle Layout"
      icon={layout === "grid" ? Icon.AppWindowList : Icon.AppWindowGrid3x3}
      onAction={onToggleLayout}
      shortcut={{
        macOS: { modifiers: ["cmd"], key: "l" },
        Windows: { modifiers: ["ctrl"], key: "l" },
      }}
    />
  );
}

export default function Command() {
  const { data: mix, isLoading, revalidate } = usePromise(async () => getMix());
  const { push } = useNavigation();
  const [busy, setBusy] = useState<string>();
  const busyRef = useRef(false);
  const [filter, setFilter] = useState("all");
  const [layout, setLayout] = useCachedState<"list" | "grid">("layout", "list");
  const [searchText, setSearchText] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string>();
  const toggleLayout = () => setLayout((current) => (current === "grid" ? "list" : "grid"));

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
                await savePreset(name, await getMix());
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
    let statusAccessory: Grid.Item.Props["accessory"];
    if (!isCached(sound)) {
      statusAccessory = { icon: Icon.Download, tooltip: "Downloads on first play" };
    } else if (isPlaying) {
      statusAccessory = { icon: { source: Icon.SpeakerOn, tintColor: Color.Green }, tooltip: "Playing" };
    } else if (entry) {
      statusAccessory = { icon: { source: Icon.Pause, tintColor: Color.Orange }, tooltip: "Paused" };
    }

    const actions = (
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
                if (next !== entry.volume) run(sound.id, `Volume ${percent(next)}`, () => setVolume(sound.id, next));
              }}
            />
            <Action
              title="Increase Volume"
              icon={Icon.SpeakerUp}
              shortcut={increaseVolumeShortcut}
              onAction={() => {
                const next = stepVolume(entry.volume, 1);
                if (next !== entry.volume) run(sound.id, `Volume ${percent(next)}`, () => setVolume(sound.id, next));
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
              await stopAll();
              await play(sound.id, entry?.volume);
            })
          }
        />
        {mixActions}
        <Action.OpenInBrowser title="Open Moodist Website" url="https://moodist.mvze.net" />
        <ToggleLayoutAction layout={layout} onToggleLayout={toggleLayout} />
      </ActionPanel>
    );
    const itemProps = { id: sound.id, title: sound.label, keywords: [sound.id], actions };

    return layout === "grid" ? (
      <Grid.Item
        key={sound.id}
        {...itemProps}
        content={soundIcons[sound.id]}
        subtitle={entry ? percent(entry.volume) : undefined}
        accessory={statusAccessory}
      />
    ) : (
      <List.Item
        key={sound.id}
        {...itemProps}
        icon={soundIcons[sound.id]}
        accessories={[
          ...(statusAccessory ? [statusAccessory] : []),
          ...(entry ? [{ tag: { value: percent(entry.volume), color } }] : []),
        ]}
      />
    );
  }

  const Layout = layout === "grid" ? Grid : List;
  const Section = layout === "grid" ? Grid.Section : List.Section;
  const Dropdown = layout === "grid" ? Grid.Dropdown : List.Dropdown;
  const EmptyView = layout === "grid" ? Grid.EmptyView : List.EmptyView;
  const layoutActions = (
    <ActionPanel>
      <ToggleLayoutAction layout={layout} onToggleLayout={toggleLayout} />
    </ActionPanel>
  );

  return (
    <Layout
      {...(layout === "grid" ? { columns: 5, inset: Grid.Inset.Large } : {})}
      isLoading={isLoading || !!busy}
      navigationTitle={navigationTitle}
      searchBarPlaceholder="Search sounds…"
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering
      selectedItemId={selectedItemId}
      onSelectionChange={(id) => setSelectedItemId(id ?? undefined)}
      actions={layoutActions}
      searchBarAccessory={
        <Dropdown tooltip="Category" value={filter} onChange={setFilter}>
          <Dropdown.Item title="All Sounds" value="all" icon={"list-music.svg"} />
          <Dropdown.Item title="In Mix" value="in-mix" icon={"list-video.svg"} />
          <Dropdown.Section>
            {categories.map((c) => (
              <Dropdown.Item key={c.id} title={c.title} value={c.id} icon={categoryIcons[c.id]} />
            ))}
          </Dropdown.Section>
        </Dropdown>
      }
    >
      {filter === "in-mix" && inMix === 0 && (
        <EmptyView
          icon={Icon.SpeakerOff}
          title="Nothing in the mix"
          description="Pick a sound to start your mix."
          actions={layoutActions}
        />
      )}
      {visible.map((c) => {
        const list = filter === "in-mix" ? c.sounds.filter((s) => sounds[s.id]) : c.sounds;
        if (!list.length) return null;
        return (
          <Section key={c.id} title={c.title}>
            {list.map(item)}
          </Section>
        );
      })}
    </Layout>
  );
}
