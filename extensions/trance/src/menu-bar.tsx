import { Icon, launchCommand, LaunchType, MenuBarExtra, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import { getSoundById } from "./lib/sound-library";
import { getPlaybackState } from "./lib/playback-state";
import { getAllPresets } from "./lib/preset-store";
import { checkTimer, clearTimer } from "./lib/timer-manager";
import * as controller from "./lib/playback-controller";
import type { PlaybackState, Preset } from "./types";

export default function MenuBarCommand() {
  const [state, setState] = useState<PlaybackState>({
    isPlaying: false,
    activeSounds: [],
    masterVolume: 80,
  });
  const [presets, setPresets] = useState<Preset[]>([]);
  const [timerInfo, setTimerInfo] = useState<{
    active: boolean;
    expired: boolean;
    remainingFormatted: string;
  }>({ active: false, expired: false, remainingFormatted: "" });
  const [isLoading, setIsLoading] = useState(true);

  const prefs = getPreferenceValues<Preferences>();
  const showCount = prefs.showMenuBarCount !== false;

  useEffect(() => {
    (async () => {
      try {
        // Reconcile playback state
        await controller.reconcile();

        // Load state
        const [s, p, t] = await Promise.all([getPlaybackState(), getAllPresets(), checkTimer()]);

        setState(s);
        setPresets(p);
        setTimerInfo(t);

        // Auto-stop on timer expiry
        if (t.expired) {
          await controller.pause();
          await clearTimer();
          const updatedState = await getPlaybackState();
          setState(updatedState);
          setTimerInfo({ active: false, expired: false, remainingFormatted: "" });
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const activeCount = state.activeSounds.length;
  const title = state.isPlaying && showCount && activeCount > 0 ? `${activeCount}` : undefined;

  return (
    <MenuBarExtra
      icon={state.isPlaying ? { source: Icon.Music, tintColor: "#7C5CFC" } : Icon.Music}
      title={title}
      tooltip={
        state.isPlaying ? `Trance — ${activeCount} sound${activeCount !== 1 ? "s" : ""} playing` : "Trance — Paused"
      }
      isLoading={isLoading}
    >
      <MenuBarExtra.Item
        title={state.isPlaying ? "Pause" : "Play"}
        icon={state.isPlaying ? Icon.Pause : Icon.Play}
        shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
        onAction={async () => {
          if (!state.isPlaying && state.activeSounds.length === 0) {
            await launchCommand({ name: "mix-sounds", type: LaunchType.UserInitiated });
            return;
          }
          const s = await controller.togglePlayback();
          setState(s);
        }}
      />

      {state.activeSounds.length > 0 && (
        <MenuBarExtra.Section title="Active Sounds">
          {state.activeSounds.map((as) => {
            const sound = getSoundById(as.soundId);
            if (!sound) return null;
            return <MenuBarExtra.Item key={as.soundId} title={`${sound.name}`} subtitle={`${as.volume}%`} />;
          })}
        </MenuBarExtra.Section>
      )}

      {presets.length > 0 && (
        <MenuBarExtra.Section title="Presets">
          {presets.slice(0, 10).map((p) => (
            <MenuBarExtra.Item
              key={p.id}
              title={p.name}
              subtitle={`${p.sounds.length} sounds`}
              onAction={async () => {
                const s = await controller.loadPreset(p);
                setState(s);
              }}
            />
          ))}
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section>
        {timerInfo.active && !timerInfo.expired && (
          <MenuBarExtra.Item title={`Timer: ${timerInfo.remainingFormatted}`} icon={Icon.Clock} />
        )}
        <MenuBarExtra.Item
          title="Open Mixer"
          icon={Icon.AppWindowGrid3x3}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={async () => {
            await launchCommand({ name: "mix-sounds", type: LaunchType.UserInitiated });
          }}
        />
        <MenuBarExtra.Item
          title="Manage Presets"
          icon={Icon.List}
          onAction={async () => {
            await launchCommand({ name: "manage-presets", type: LaunchType.UserInitiated });
          }}
        />
        <MenuBarExtra.Item
          title="Set Timer"
          icon={Icon.Clock}
          onAction={async () => {
            await launchCommand({ name: "set-timer", type: LaunchType.UserInitiated });
          }}
        />
        {state.isPlaying && (
          <MenuBarExtra.Item
            title="Stop All"
            icon={Icon.Stop}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            onAction={async () => {
              const s = await controller.stopAll();
              setState(s);
            }}
          />
        )}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
