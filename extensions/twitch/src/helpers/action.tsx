import { Action, ActionPanel, getPreferenceValues, Icon } from "@raycast/api";
import { PrimaryAction } from "../interfaces/Preferences";
import { watchStream } from "./streamlink";
import { type ComponentProps } from "react";

const preferences = getPreferenceValues();
const streamlinkLocation = preferences.streamlink;
const quality = preferences.quality;
const lowlatency = preferences.lowlatency;
const primary = preferences.primaryaction;
const streamlinkConfig = preferences.streamlinkConfig;

export const primaryActionBrowser = primary === PrimaryAction.Browser;
export const primaryActionStreamlink = primary === PrimaryAction.Streamlink;

export const ActionWatchStream = ({ name, ...props }: { name: string } & ComponentProps<typeof Action>) => (
  <Action
    {...props}
    onAction={() => {
      watchStream(name, streamlinkLocation, quality, lowlatency, streamlinkConfig);
      props.onAction?.();
    }}
  />
);

const LocalStreamAction = ({ name, onAction }: { name: string; onAction?: () => void }) => (
  <ActionWatchStream icon={Icon.Eye} title="Watch Stream" name={name} onAction={onAction} />
);

const BrowserStreamAction = ({ name, onAction }: { name: string; onAction?: () => void }) => (
  <Action.OpenInBrowser title="Open Stream in Browser" url={`https://twitch.tv/${name}`} onOpen={onAction} />
);

const OpenChatAction = ({ name, onAction }: { name: string; onAction?: () => void }) => (
  <Action.OpenInBrowser
    title="Open Chat"
    url={`https://twitch.tv/${name}/chat?popout=`}
    icon={Icon.SpeechBubble}
    onOpen={onAction}
  />
);

const OpenChannelAction = ({ name, onAction }: { name: string; onAction?: () => void }) => (
  <Action.OpenInBrowser title="Open Channel in Browser" url={`https://twitch.tv/${name}`} onOpen={onAction} />
);

export const action = (name: string, isLive = true, onAction?: () => void) => {
  return (
    <ActionPanel>
      {!isLive && <OpenChannelAction name={name} onAction={onAction} />}
      {isLive && (
        <>
          {primaryActionBrowser && (
            <>
              <BrowserStreamAction name={name} onAction={onAction} />
              <LocalStreamAction name={name} onAction={onAction} />
            </>
          )}
          {primaryActionStreamlink && (
            <>
              <LocalStreamAction name={name} onAction={onAction} />
              <BrowserStreamAction name={name} onAction={onAction} />
            </>
          )}
        </>
      )}
      <ActionPanel.Section>
        <OpenChatAction name={name} onAction={onAction} />
      </ActionPanel.Section>
    </ActionPanel>
  );
};
