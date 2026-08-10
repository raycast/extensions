import type { Dispatch, SetStateAction } from "react";

import { Action, ActionPanel, Icon, List } from "@raycast/api";

import type { SoundInstance } from "@/types";

import type { PlayState } from "@/hooks/useSoundPlayer";

import UserDetails from "./UserDetails";

export default function ListItem({
  sound,
  isShowingDetail,
  setIsShowingDetail,
  playSound,
  stop,
  playState,
}: {
  sound: SoundInstance;
  isShowingDetail: boolean;
  setIsShowingDetail: Dispatch<SetStateAction<boolean>>;
  playSound: (url: string, id: number) => void;
  stop: () => void;
  playState: PlayState;
}) {
  const duration = sound.duration ? `${Math.round(100 * sound.duration) / 100}s` : "";
  const description = sound.description ? sound.description.split("\n")[0] : "";
  const isPlaying = playState.id === sound.id && playState.filePath !== null;

  const markdown = `
# ${sound.name}
> ${sound.description}
${sound.images?.waveform_l ? `\n### Waveform:\n![Waveform](${sound.images.waveform_l})\n` : ""}
${sound.images?.spectral_l ? `\n### Spectral:\n![Spectral](${sound.images.spectral_l})\n` : ""}
`;

  return (
    <List.Item
      id={`sound-${sound.id}`}
      icon={{ source: isPlaying ? Icon.Play : "command-icon.png" }}
      subtitle={isShowingDetail ? "" : `${duration.length > 0 ? `(${duration})` : ""} ${description}`}
      title={sound.name}
      actions={
        <ActionPanel>
          <Action title="Toggle Details" onAction={() => setIsShowingDetail((prev) => !prev)} />
          {sound.url ? (
            <Action.OpenInBrowser url={sound.url} icon={{ source: Icon.Globe }} title="Open In Browser" />
          ) : null}
          {sound.previews?.["preview-hq-mp3"] ? (
            <Action
              title={isPlaying ? "Stop" : "Play Preview (HQ)"}
              onAction={() => {
                if (isPlaying) {
                  stop();
                } else {
                  playSound(sound.previews["preview-hq-mp3"], sound.id);
                }
              }}
              icon={{ source: isPlaying ? Icon.Pause : Icon.Play }}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
          ) : null}
          {sound.username ? (
            <Action.Push
              title="User Details"
              target={<UserDetails userName={sound.username} />}
              icon={{ source: Icon.Person }}
              shortcut={{ modifiers: ["cmd"], key: "u" }}
            />
          ) : null}
        </ActionPanel>
      }
      detail={
        <List.Item.Detail
          markdown={markdown}
          metadata={
            <List.Item.Detail.Metadata>
              {sound.url ? <List.Item.Detail.Metadata.Link title="URL" text={sound.url} target={sound.url} /> : null}
              <List.Item.Detail.Metadata.Label title="Username" icon={{ source: Icon.Person }} text={sound.username} />
              {sound.avg_rating && sound.avg_rating > 0 ? (
                <List.Item.Detail.Metadata.Label
                  title="Rating"
                  icon={{ source: Icon.Star }}
                  text={`${sound.avg_rating} (${sound.num_ratings})`}
                />
              ) : null}
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Type"
                icon={{ source: Icon.Waveform }}
                text={sound.type?.toUpperCase()}
              />
              {sound.channels ? (
                <List.Item.Detail.Metadata.Label
                  title="Channels"
                  text={sound.channels === 1 ? "Mono" : sound.channels === 2 ? "Stereo" : sound.channels.toString()}
                />
              ) : null}
              {duration.length > 0 ? <List.Item.Detail.Metadata.Label title="Duration" text={duration} /> : null}
              {sound.bitrate ? (
                <List.Item.Detail.Metadata.Label title="Bitrate" text={sound.bitrate ? `${sound.bitrate} kbps` : ""} />
              ) : null}
              {sound.bitdepth ? (
                <List.Item.Detail.Metadata.Label
                  title="Bitdepth"
                  text={sound.bitdepth ? `${sound.bitdepth} bit` : ""}
                />
              ) : null}
              <List.Item.Detail.Metadata.Label
                title="Samplerate"
                text={sound.samplerate ? `${sound.samplerate / 1000} kHz` : ""}
              />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.TagList title="Tags">
                {sound.tags?.map((tag, index) => (
                  <List.Item.Detail.Metadata.TagList.Item key={`${sound.id}-${index}-${tag}`} text={tag} />
                ))}
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.Separator />
              {sound.license ? (
                <List.Item.Detail.Metadata.Link title="License" text={sound.license} target={sound.license} />
              ) : null}
              <List.Item.Detail.Metadata.Label
                title="Downloads"
                icon={{ source: Icon.Download }}
                text={sound.num_downloads.toString()}
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
}
