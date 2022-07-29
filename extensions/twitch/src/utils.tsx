import { ActionPanel, getPreferenceValues, Action, Icon, showHUD, showToast, Toast } from "@raycast/api";
import { Preferences, PrimaryAction } from "./interfaces/Preferences";
import Stream from "./stream";

interface Props {
  live: boolean;
  name: string;
}

const action: React.FC<Props> = ({ live, name }) => {
  const preferences: Preferences = getPreferenceValues();
  const streamlinkLocation = preferences.streamlink;
  const quality = preferences.quality;
  const lowlatency = preferences.lowlatency;
  const primary = preferences.primaryaction;

  return (
    <>
      <ActionPanel>
        {primary === PrimaryAction.Browser && (
          <Action.Open
            title="Open Channel"
            icon={Icon.Globe}
            target={`https://twitch.tv/${name}`}
            onOpen={(target) => {
              showHUD("✅ Opening stream");
            }}
          />
        )}
        <Action
          title="Open Stream in Streamlink"
          icon={Icon.Link}
          onAction={() => {
            if (!live) {
              showToast(Toast.Style.Failure, "This streamer is offline!");
              return;
            }

            if (lowlatency) {
              Stream.startLowLatencyStream(streamlinkLocation, quality, name).catch((err) => {
                showToast(Toast.Style.Failure, err);
              });

              showHUD("✅ Starting Streamlink");
            } else {
              Stream.streamUsingM3U8(streamlinkLocation, quality, name).catch((err) => {
                showToast(Toast.Style.Failure, err);
              });
              showHUD("✅ Starting Streamlink");
            }
          }}
        />
        {primary === PrimaryAction.Streamlink && (
          <Action.Open
            title="Open Channel"
            icon={Icon.Globe}
            target={`https://twitch.tv/${name}`}
            onOpen={(target) => {
              showHUD("✅ Opening stream");
            }}
          />
        )}
      </ActionPanel>
    </>
  );
};

export default action;
