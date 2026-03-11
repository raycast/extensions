import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { usePlayback } from "./hooks/use-playback";
import { SOUND_CATEGORIES, getSoundsByCategory } from "./lib/sound-library";
import { VOLUME_PRESETS } from "./lib/constants";

export default function MixSoundsCommand() {
  const { state, isLoading, toggle, toggleSound, setVolume, setMasterVolume, stopAll } = usePlayback();

  const activeCount = state.activeSounds.length;
  const subtitle = state.isPlaying
    ? `Playing ${activeCount} sound${activeCount !== 1 ? "s" : ""}`
    : activeCount > 0
      ? `${activeCount} sound${activeCount !== 1 ? "s" : ""} ready`
      : undefined;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search sounds..." navigationTitle="Trance">
      {subtitle && <List.EmptyView title="No matching sounds" description="Try a different search term" />}
      {SOUND_CATEGORIES.map((cat) => (
        <List.Section key={cat.id} title={cat.name} subtitle={`${getSoundsByCategory(cat.id).length} sounds`}>
          {getSoundsByCategory(cat.id).map((sound) => {
            const active = state.activeSounds.find((s) => s.soundId === sound.id);
            return (
              <List.Item
                key={sound.id}
                title={sound.name}
                subtitle={sound.description}
                icon={{ source: Icon.Music, tintColor: active ? Color.Green : Color.SecondaryText }}
                accessories={
                  active
                    ? [
                        {
                          tag: { value: `${active.volume}%`, color: Color.Green },
                        },
                        ...(state.isPlaying ? [{ icon: { source: Icon.SpeakerOn, tintColor: Color.Green } }] : []),
                      ]
                    : []
                }
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title="Sound">
                      <Action
                        title={active ? "Remove from Mix" : "Add to Mix"}
                        icon={active ? Icon.Minus : Icon.Plus}
                        onAction={async () => {
                          await toggleSound(sound.id);
                          if (!active) {
                            await showToast({ style: Toast.Style.Success, title: `Added ${sound.name}` });
                          }
                        }}
                      />
                      {active && (
                        <ActionPanel.Submenu
                          title="Set Volume"
                          icon={Icon.SpeakerOn}
                          shortcut={{ modifiers: ["cmd"], key: "v" }}
                        >
                          {VOLUME_PRESETS.map((v) => (
                            <Action
                              key={v}
                              title={`${v}%${v === active.volume ? " (current)" : ""}`}
                              icon={v === active.volume ? Icon.Checkmark : undefined}
                              onAction={async () => {
                                await setVolume(sound.id, v);
                              }}
                            />
                          ))}
                        </ActionPanel.Submenu>
                      )}
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Playback">
                      <Action
                        title={state.isPlaying ? "Pause All" : "Play All"}
                        icon={state.isPlaying ? Icon.Pause : Icon.Play}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                        onAction={async () => {
                          if (!state.isPlaying && state.activeSounds.length === 0) {
                            await showToast({
                              style: Toast.Style.Failure,
                              title: "No sounds in mix",
                              message: "Add some sounds first",
                            });
                            return;
                          }
                          await toggle();
                        }}
                      />
                      {state.activeSounds.length > 0 && (
                        <Action
                          title="Stop All & Clear Mix"
                          icon={Icon.Stop}
                          style={Action.Style.Destructive}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
                          onAction={stopAll}
                        />
                      )}
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Master Volume">
                      <ActionPanel.Submenu
                        title={`Master Volume (${state.masterVolume}%)`}
                        icon={Icon.SpeakerHigh}
                        shortcut={{ modifiers: ["cmd"], key: "m" }}
                      >
                        {VOLUME_PRESETS.map((v) => (
                          <Action
                            key={v}
                            title={`${v}%${v === state.masterVolume ? " (current)" : ""}`}
                            icon={v === state.masterVolume ? Icon.Checkmark : undefined}
                            onAction={() => setMasterVolume(v)}
                          />
                        ))}
                      </ActionPanel.Submenu>
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
