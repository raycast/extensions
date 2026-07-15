import { useCallback, useState, useRef } from "react";
import {
  ActionPanel,
  Action,
  List,
  getPreferenceValues,
  Icon,
  openCommandPreferences,
  Clipboard,
  Toast,
  showToast,
  Keyboard,
} from "@raycast/api";

export default function Command() {
  const startTime = useRef(0);
  const [taps, setTaps] = useState<number>(0);
  const [bpm, setBPM] = useState<number>(0);
  const [bpmToSave, setBpmToSave] = useState<number>(0);
  const preferences = getPreferenceValues<Preferences>();

  function resetStart(value: number) {
    startTime.current = value;
    setTaps(0);
    setBPM(0);
    setBpmToSave(0);
  }

  const handleTap = useCallback(() => {
    const timesince = (new Date().getTime() - startTime.current) / 1000;
    if (timesince > Number(preferences.seconds)) {
      resetStart(new Date().getTime());
    }

    setTaps((previous) => previous + 1);

    setBPM((taps / timesince) * 60);

    const bpmToSave = Math.round((taps / timesince) * 60);
    setBpmToSave(bpmToSave);
  }, [taps]);

  // onAction callback
  const handleCopyBPM = async () => {
    await Clipboard.copy(bpmToSave.toString());
    await showToast({
      style: Toast.Style.Success,
      title: `BPM: ${bpmToSave}`,
      message: "Copied to clipboard...",
    });
  };

  return (
    <List>
      <List.EmptyView
        icon={taps % 2 === 0 ? "metronome-left.png" : "metronome-right.png"}
        title={startTime && bpm > 0 ? `Calculated BPM: ${bpm.toFixed(0)}` : "Ready to start!"}
        description={
          startTime && bpm > 0
            ? `Halftime: ${Math.floor(bpm) / 2} | Doubletime: ${Math.floor(bpm) * 2}`
            : startTime
              ? "Keep pressing enter to the beat!"
              : "Hit enter to the beat!"
        }
        actions={
          <ActionPanel>
            <Action title="Beat" icon={Icon.Music} onAction={handleTap} />
            {taps > 0 && (
              <>
                <Action
                  title="Reset"
                  icon={Icon.Eraser}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={() => resetStart(0)}
                />
                <Action
                  title="Copy BPM to Clipboard"
                  icon={Icon.Clipboard}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                  onAction={handleCopyBPM}
                />
              </>
            )}
            <ActionPanel.Section key="secondary">
              <Action
                icon={Icon.Gear}
                title="Open Command Preferences"
                shortcut={{
                  macOS: { modifiers: ["cmd", "shift"], key: "," },
                  Windows: { modifiers: ["ctrl"], key: "," },
                }}
                onAction={openCommandPreferences}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    </List>
  );
}
