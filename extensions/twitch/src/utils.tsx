import { ActionPanel, getPreferenceValues, OpenAction, showHUD, showToast, ToastStyle } from "@raycast/api";
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
          <OpenAction
            title="Open Channel"
            target={`https://twitch.tv/${name}`}
            onOpen={(target) => {
              showHUD("✅ Opening stream");
            }}
          />
        )}
        <OpenAction
          title="Open Stream in Streamlink"
          target="streamlink"
          onOpen={(target) => {
            if (!live) {
              showToast(ToastStyle.Failure, "This streamer is offline!");
              return;
            }

            if (lowlatency) {
              Stream.startLowLatencyStream(streamlinkLocation, quality, name).catch((err) => {
                showToast(ToastStyle.Failure, err);
              });

              showHUD("✅ Starting Streamlink");
            } else {
              Stream.streamUsingM3U8(streamlinkLocation, quality, name).catch((err) => {
                showToast(ToastStyle.Failure, err);
              });
              showHUD("✅ Starting Streamlink");
            }
          }}
        />
        {primary === PrimaryAction.Streamlink && (
          <OpenAction
            title="Open Channel"
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
