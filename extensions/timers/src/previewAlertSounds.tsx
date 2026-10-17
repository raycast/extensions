import { Action, ActionPanel, getPreferenceValues, Icon, List } from "@raycast/api";
import { showError } from "@chrismessina/raycast-kit";
import { useEffect, useRef, useState } from "react";
import { Preferences } from "./backend/types";
import { soundData } from "./backend/soundData";
import { SoundPreview, startSoundPreview } from "./backend/soundPreview";

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const playback = useRef<SoundPreview | undefined>(undefined);
  const request = useRef(0);
  const mounted = useRef(true);
  const [playing, setPlaying] = useState<string>();
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      request.current++;
      void playback.current?.stop().catch(console.error);
    };
  }, []);

  const control = async (sound?: string) => {
    const id = ++request.current;
    try {
      await playback.current?.stop();
      if (id !== request.current || !mounted.current) return;
      playback.current = undefined;
      setPlaying(undefined);
      if (!sound) return;
      const current = startSoundPreview(sound, prefs.volumeSetting);
      playback.current = current;
      setPlaying(sound);
      try {
        await current.done;
      } finally {
        if (playback.current === current) {
          playback.current = undefined;
          if (mounted.current) setPlaying(undefined);
        }
      }
    } catch (error) {
      if (mounted.current && id === request.current) await showError(error, { title: "Sound Preview Failed" });
    }
  };

  return (
    <List>
      {soundData.map((sound) => (
        <List.Item
          key={sound.value}
          icon={sound.icon}
          title={sound.value === prefs.selectedSound ? `${sound.title} (currently selected)` : sound.title}
          accessories={playing === sound.value ? [{ tag: "Playing" }] : []}
          actions={
            <ActionPanel>
              {playing === sound.value ? (
                <Action title="Stop Sound" icon={Icon.Stop} onAction={() => control()} />
              ) : (
                <Action title="Play Sound" icon={Icon.Play} onAction={() => control(sound.value)} />
              )}
              {playing && playing !== sound.value ? (
                <Action title="Stop Sound" icon={Icon.Stop} onAction={() => control()} />
              ) : null}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
