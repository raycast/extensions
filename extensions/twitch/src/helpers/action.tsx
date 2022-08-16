import { Action, ActionPanel, getPreferenceValues, Icon } from "@raycast/api";
import { PrimaryAction } from "../interfaces/Preferences";
import { watchStream } from "./streamlink";

export const action = (name: string, isLive = true) => {
  const preferences = getPreferenceValues();
  const streamlinkLocation = preferences.streamlink;
  const quality = preferences.quality;
  const lowlatency = preferences.lowlatency;
  const primary = preferences.primaryaction;
  const streamlinkConfig = preferences.streamlinkConfig;

  return (
    <ActionPanel>
      {!isLive && <Action.OpenInBrowser title="Open Channel in Browser" url={`https://twitch.tv/${name}`} />}
      {primary === PrimaryAction.Browser && isLive && (
        <Action.OpenInBrowser title="Open Stream in Browser" url={`https://twitch.tv/${name}`} />
      )}
      {primary === PrimaryAction.Browser && isLive && (
        <Action
          icon={Icon.Eye}
          title="Watch Stream"
          onAction={() => watchStream(name, streamlinkLocation, quality, lowlatency, streamlinkConfig)}
        />
      )}
      {primary === PrimaryAction.Streamlink && isLive && (
        <Action
          icon={Icon.Eye}
          title="Watch Stream"
          onAction={() => watchStream(name, streamlinkLocation, quality, lowlatency, streamlinkConfig)}
        />
      )}
      {primary === PrimaryAction.Streamlink && isLive && (
        <Action.OpenInBrowser title="Open Stream in Browser" url={`https://twitch.tv/${name}`} />
      )}
      <ActionPanel.Section>
        <Action.OpenInBrowser
          title="Open Chat"
          url={`https://twitch.tv/${name}/chat?popout=`}
          icon={Icon.SpeechBubble}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
};
