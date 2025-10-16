import { useCallback, useState, useRef } from "react";
import { ActionPanel, Action, List, getPreferenceValues, Icon, openCommandPreferences } from "@raycast/api";

export default function Command() {
  const startTime = useRef(0);
  const [taps, setTaps] = useState<number>(0);
  const [bpm, setBPM] = useState<number>(0);
  const preferences = getPreferenceValues<Preferences>();

  interface Preferences {
    seconds: number;
  }

  function resetStart(value: number) {
    startTime.current = value;
    setTaps(0);
    setBPM(0);
  }

  const handleTap = useCallback(() => {
    const timesince = (new Date().getTime() - startTime.current) / 1000;
    if (timesince > preferences.seconds) {
      resetStart(new Date().getTime());
    }

    setTaps((previous) => previous + 1);

    setBPM((taps / timesince) * 60);
  }, [taps]);

  return (
    <List>
      <List.EmptyView
        icon={taps % 2 === 0 ? "metronome-left.png" : "metronome-right.png"}
        title={startTime && bpm > 0 ? `Calculated BPM: ${bpm.toFixed(0)}` : "Ready to start!"}
        description={startTime ? "Keep pressing enter to the beat!" : "Hit enter to the beat!"}
        actions={
          <ActionPanel>
            <Action title="Beat" icon={Icon.Music} onAction={handleTap} />
            <Action
              title="Reset"
              icon={Icon.Eraser}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={() => resetStart(0)}
            />
            <ActionPanel.Section key="secondary">
              <Action
                icon={Icon.Gear}
                title="Open Command Preferences"
                shortcut={{ modifiers: ["cmd"], key: "," }}
                onAction={openCommandPreferences}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    </List>
  );
}
