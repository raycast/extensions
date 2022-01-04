import { ActionPanel, getPreferenceValues, OpenAction, showToast, ToastStyle } from "@raycast/api";
import Preferences from "./interfaces/preferences";
import Stream from './stream';

interface Props {
    live: Boolean,
    name: String
}

const action: React.FC<Props> = (({ live, name }) => {
    const preferences: Preferences = getPreferenceValues();
    const streamlinkLocation = preferences.streamlink;
    const quality = preferences.quality;
    const lowlatency = preferences.lowlatency;

    console.log(preferences)

    return (<>
        <ActionPanel>
            <OpenAction title="Open Channel" target={`https://twitch.tv/${name}`} />
            <OpenAction title="Open Stream in Streamlink" target="streamlink" onOpen={(target) => {
                if (!live) { showToast(ToastStyle.Failure, "This streamer is offline!"); return; }

                if (lowlatency) {
                    Stream.startLowLatencyStream(streamlinkLocation, quality, name).catch(err => {
                        showToast(ToastStyle.Failure, err);
                    });
                } else {
                    Stream.streamUsingM3U8(streamlinkLocation, quality, name).catch(err => {
                        showToast(ToastStyle.Failure, err);
                    });
                }
            }} shortcut={{ modifiers: ["opt"], key: "enter" }} />
        </ActionPanel>
    </>);
});

export default action;