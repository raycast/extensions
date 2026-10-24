import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { playSound } from "./alert";
import { getSelectedRingSound, listRingSounds, setSelectedRingSound, type RingSound } from "./sounds";

export default function Command() {
  const sounds = listRingSounds();
  const [selectedId, setSelectedId] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getSelectedRingSound()
      .then((sound) => setSelectedId(sound?.id))
      .finally(() => setIsLoading(false));
  }, []);

  async function preview(sound: RingSound) {
    try {
      await playSound(sound);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not play sound",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function select(sound: RingSound) {
    await setSelectedRingSound(sound.id);
    setSelectedId(sound.id);
    await showToast({ style: Toast.Style.Success, title: `Ring sound set to ${sound.title}` });
    await preview(sound);
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search ring sounds">
      <List.EmptyView
        title="No system sounds found"
        description="Timer finish will stay silent until a sound is available."
      />
      {sounds.map((sound) => {
        const isCurrent = sound.id === selectedId;
        return (
          <List.Item
            key={sound.id}
            icon={isCurrent ? { source: Icon.CheckCircle, tintColor: Color.Green } : Icon.SpeakerOn}
            title={sound.title}
            subtitle={isCurrent ? "Current" : undefined}
            accessories={isCurrent ? [{ text: "Selected" }] : []}
            actions={
              <ActionPanel>
                <Action title="Use Ring Sound" icon={Icon.Check} onAction={() => select(sound)} />
                <Action title="Preview" icon={Icon.Play} onAction={() => preview(sound)} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
