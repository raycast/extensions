import {
  Action,
  ActionPanel,
  Icon,
  LaunchProps,
  List,
  popToRoot,
  showHUD,
} from "@raycast/api";
import { setVolume, getVolume } from "./lib/cli";
import { VOLUME_STEPS } from "./lib/constants";
import { ErrorView } from "./components/ErrorView";
import { useCachedPromise } from "@raycast/utils";

export default function Command(
  props: LaunchProps<{ arguments: { level?: string } }>,
) {
  const levelArg = props.arguments.level?.trim();

  if (levelArg) {
    const parsed = parseInt(levelArg, 10);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 200) {
      return <SetVolumeImmediate level={parsed} />;
    }
  }

  return <VolumeList />;
}

function SetVolumeImmediate({ level }: { level: number }) {
  const { isLoading, error } = useCachedPromise(
    async (lvl: number) => {
      const vol = await setVolume(lvl);
      await showHUD(`🔊 Volume: ${Math.round(vol)}%`);
      await popToRoot();
      return vol;
    },
    [level],
  );

  if (error) return <ErrorView error={error} />;

  return <List isLoading={isLoading} />;
}

function VolumeList() {
  const { data: currentVolume, error, isLoading } = useCachedPromise(getVolume);

  if (error) return <ErrorView error={error} />;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Set volume level (0–100)">
      {VOLUME_STEPS.map((step) => (
        <List.Item
          key={step}
          title={`${step}%`}
          icon={
            step === 0
              ? Icon.SpeakerOff
              : step <= 33
                ? Icon.SpeakerLow
                : step <= 66
                  ? Icon.Speaker
                  : Icon.SpeakerHigh
          }
          accessories={
            currentVolume !== undefined && Math.round(currentVolume) === step
              ? [{ tag: { value: "Current", color: "#007AFF" } }]
              : []
          }
          actions={
            <ActionPanel>
              <Action
                title={`Set Volume to ${step}%`}
                icon={Icon.SpeakerHigh}
                onAction={async () => {
                  const vol = await setVolume(step);
                  await showHUD(`🔊 Volume: ${Math.round(vol)}%`);
                  await popToRoot();
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
