import { Action, ActionPanel, List, Clipboard, Toast, showToast } from "@raycast/api";
import { useRef, useState } from "react";

export default function getBpm() {
  const [timestampArr, setTimestampArr] = useState<number[]>([]);
  const timeoutId = useRef<ReturnType<typeof setTimeout> | null>(null);

  const timestamp: number = Date.now();

  const firstTimestamp = timestampArr[0];
  const lastTimestamp = timestampArr[timestampArr.length - 1];
  const numberOfIntervals = timestampArr.length - 2;
  const bpm = (numberOfIntervals / ((lastTimestamp - firstTimestamp) / 1000)) * 60;

  const handleTap = () => {
    if (timeoutId.current !== null) {
      clearTimeout(timeoutId.current);
    }
    setTimestampArr([...timestampArr, timestamp]);
    timeoutId.current = setTimeout(async () => {
      console.log("Timeout reached");
      await Clipboard.copy(bpm);
      await showToast({
        style: Toast.Style.Success,
        title: `BPM: ${Math.floor(bpm)}`,
        message: "Copied to clipboard...",
      });
      setTimestampArr([]);
    }, 5000);
  };

  return (
    <List>
      <List.EmptyView
        icon="🥁"
        title={timestampArr.length > 2 ? `BPM: ${Math.floor(bpm)}` : `Tap SPACE/ENTER...`}
        description={
          timestampArr.length > 2 ? `Halftime: ${Math.floor(bpm) / 2} | Doubletime: ${Math.floor(bpm) * 2}` : ""
        }
        actions={
          <ActionPanel>
            <Action
              title="Space"
              shortcut={{ modifiers: [], key: "space" }}
              onAction={() => {
                handleTap();
              }}
            ></Action>
          </ActionPanel>
        }
      ></List.EmptyView>
    </List>
  );
}
