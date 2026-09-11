import { Action, ActionPanel, List, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getVolume, setVolume, isKasetRunning } from "./utils/kaset";

const volumeLevels = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

export default function Volume() {
  const { data: currentVolume, isLoading, revalidate } = usePromise(getVolume);
  const { data: running } = usePromise(isKasetRunning);

  if (!running) {
    return (
      <List>
        <List.EmptyView
          title="Kaset is not running"
          description="Please launch Kaset to use this extension."
          actions={
            <ActionPanel>
              <Action.Open title="Launch Kaset" target="kaset://" />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading}>
      {volumeLevels.map((level) => (
        <List.Item
          key={level}
          title={`${level}%`}
          icon={getVolumeIcon(level)}
          accessories={[
            currentVolume === level
              ? { icon: Icon.Checkmark, text: "Current" }
              : {},
          ]}
          actions={
            <ActionPanel>
              <Action
                title={`Set Volume to ${level}%`}
                onAction={async () => {
                  await setVolume(level);
                  revalidate();
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function getVolumeIcon(level: number): Icon {
  if (level === 0) return Icon.SpeakerOff;
  if (level < 33) return Icon.SpeakerLow;
  if (level < 66) return Icon.SpeakerOn;
  return Icon.SpeakerHigh;
}
