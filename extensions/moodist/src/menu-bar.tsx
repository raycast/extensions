import {
  Color,
  getPreferenceValues,
  Icon,
  Image,
  Keyboard,
  launchCommand,
  LaunchType,
  MenuBarExtra,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import {
  cancelTimer,
  findSound,
  getMix,
  pause,
  percent,
  playingCount,
  resume,
  setMaster,
  setVolume,
  stop,
  stopAll,
  timerRemaining,
  VOLUMES,
} from "./player";
import { getPresets, playPreset, presetStatus } from "./presets";

function open(name: string) {
  return launchCommand({ name, type: LaunchType.UserInitiated });
}

export default function Command() {
  const { data, isLoading } = usePromise(async () => ({ mix: getMix(), presets: await getPresets() }));
  const { showMenuBarCount } = getPreferenceValues<Preferences.MenuBar>();

  async function act(fn: () => unknown) {
    try {
      await fn();
    } catch (e) {
      await showFailureToast(e, { title: "Moodist" });
    }
  }

  const mix = data?.mix;
  const presets = data?.presets ?? [];
  const entries = mix ? Object.entries(mix.sounds) : [];
  const playing = mix ? playingCount(mix) : 0;

  return (
    <MenuBarExtra
      icon={{ source: "menubar-icon.png", tintColor: playing ? "#7C5CFC" : Color.PrimaryText }}
      title={showMenuBarCount && playing ? String(playing) : undefined}
      tooltip={
        playing
          ? `Moodist — ${playing} sound${playing === 1 ? "" : "s"} playing`
          : entries.length
            ? "Moodist — Paused"
            : "Moodist"
      }
      isLoading={isLoading}
    >
      {entries.length > 0 && (
        <MenuBarExtra.Item
          title={playing ? "Pause" : "Resume"}
          icon={playing ? Icon.Pause : Icon.Play}
          onAction={() => act(playing ? pause : resume)}
        />
      )}

      {mix && entries.length > 0 && (
        <MenuBarExtra.Section title={playing ? "Playing" : "Paused"}>
          {entries.map(([id, entry]) => (
            <MenuBarExtra.Submenu
              key={id}
              title={`${findSound(id)?.label ?? id} · ${percent(entry.volume)}`}
              icon={entry.pid ? Icon.SpeakerHigh : Icon.Pause}
            >
              {VOLUMES.map((v) => (
                <MenuBarExtra.Item
                  key={v}
                  title={percent(v)}
                  icon={v === entry.volume ? Icon.Checkmark : undefined}
                  onAction={() => act(() => setVolume(id, v))}
                />
              ))}
              <MenuBarExtra.Section>
                <MenuBarExtra.Item title="Remove from Mix" icon={Icon.Minus} onAction={() => act(() => stop(id))} />
              </MenuBarExtra.Section>
            </MenuBarExtra.Submenu>
          ))}
          <MenuBarExtra.Submenu title={`Master Volume · ${percent(mix.master)}`} icon={Icon.SpeakerOn}>
            {VOLUMES.map((v) => (
              <MenuBarExtra.Item
                key={v}
                title={percent(v)}
                icon={v === mix.master ? Icon.Checkmark : undefined}
                onAction={() => act(() => setMaster(v))}
              />
            ))}
          </MenuBarExtra.Submenu>
        </MenuBarExtra.Section>
      )}

      {presets.length > 0 && (
        <MenuBarExtra.Section title="Presets">
          {presets.slice(0, 10).map((p) => {
            const status = mix ? presetStatus(p, mix) : undefined;
            let icon: Image.ImageLike | undefined = p.pinned ? Icon.Pin : undefined;
            if (status === "playing" || status === "paused") icon = Icon.Checkmark;
            return (
              <MenuBarExtra.Item
                key={p.id}
                title={p.name}
                icon={icon}
                subtitle={
                  status === "modified" ? "Modified" : `${p.sounds.length} sound${p.sounds.length === 1 ? "" : "s"}`
                }
                onAction={() => act(() => playPreset(p))}
              />
            );
          })}
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section>
        {mix?.timer ? (
          <MenuBarExtra.Submenu title={`Sleep Timer · ${timerRemaining(mix.timer)} left`} icon={Icon.Clock}>
            <MenuBarExtra.Item title="Cancel Timer" icon={Icon.XMarkCircle} onAction={() => act(cancelTimer)} />
            <MenuBarExtra.Item title="Set New Timer…" icon={Icon.Clock} onAction={() => open("set-timer")} />
          </MenuBarExtra.Submenu>
        ) : (
          <MenuBarExtra.Item title="Set Sleep Timer…" icon={Icon.Clock} onAction={() => open("set-timer")} />
        )}
        <MenuBarExtra.Item
          title="Open Mixer"
          icon={Icon.AppWindowGrid3x3}
          shortcut={Keyboard.Shortcut.Common.Open}
          onAction={() => open("mix-sounds")}
        />
        <MenuBarExtra.Item title="Manage Presets" icon={Icon.List} onAction={() => open("manage-presets")} />
        {entries.length > 0 && (
          <MenuBarExtra.Item
            title="Stop All"
            icon={Icon.Stop}
            shortcut={Keyboard.Shortcut.Common.RemoveAll}
            onAction={() => act(stopAll)}
          />
        )}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
