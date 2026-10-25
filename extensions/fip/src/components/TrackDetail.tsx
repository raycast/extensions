import { Action, ActionPanel, Detail, Icon, Keyboard } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect } from "react";
import { fetchSnapshot, nextPollDelay, timelineAt, TimelinePosition, Track } from "../livemeta";
import { lastStartedRadio } from "../playback";
import { Radio } from "../radios";

const RETRY_DELAY = 30_000;

async function loadTimeline() {
  const radio = await lastStartedRadio();
  const { tracks, refreshIn } = await fetchSnapshot(radio.id);
  const now = new Date();
  return { radio, timeline: timelineAt(tracks, now), refreshIn: nextPollDelay(tracks, now, refreshIn) };
}

const MISSING_TRACK: Record<TimelinePosition, (radio: Radio) => string> = {
  previous: (radio) => `Radio France doesn't publish the track played before the current one on ${radio.title}.`,
  current: (radio) => `Radio France hasn't published the song airing on ${radio.title} right now.`,
  next: (radio) => `Radio France hasn't announced the next track on ${radio.title} yet.`,
};

const time = (date: Date) => date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function TrackMetadata({ radio, track }: { radio: Radio; track: Track }) {
  return (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Radio" text={radio.title} />
      <Detail.Metadata.Label title="Title" text={track.title} />
      <Detail.Metadata.Label title="Artist" text={track.artist} />
      {track.album ? <Detail.Metadata.Label title="Album" text={track.album} /> : null}
      {track.year ? <Detail.Metadata.Label title="Year" text={String(track.year)} /> : null}
      {track.label ? <Detail.Metadata.Label title="Label" text={track.label} /> : null}
      <Detail.Metadata.Label title="Airing" text={`${time(track.start)} – ${time(track.end)}`} />
    </Detail.Metadata>
  );
}

export function TrackDetail({ position }: { position: TimelinePosition }) {
  const { data, error, isLoading, revalidate } = usePromise(loadTimeline, [], {
    failureToastOptions: { title: "Could not load the FIP tracks" },
  });
  const track = data?.timeline[position];

  // A failed load clears `data`, so the retry has to hang off `error`.
  useEffect(() => {
    const delay = error ? RETRY_DELAY : data?.refreshIn;
    if (delay === undefined) {
      return;
    }
    const timer = setTimeout(revalidate, delay);
    return () => clearTimeout(timer);
  }, [data, error]);

  const markdown = !data
    ? error && `Could not reach Radio France: ${error.message}`
    : !track
      ? MISSING_TRACK[position](data.radio)
      : track.coverUrl
        ? `![Cover](${track.coverUrl}?raycast-height=350)`
        : `# ${track.title}\n\n${track.artist}`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={data && track && <TrackMetadata radio={data.radio} track={track} />}
      actions={
        <ActionPanel>
          {track && <Action.CopyToClipboard title="Copy Track Name" content={`${track.artist} – ${track.title}`} />}
          {data && <Action.OpenInBrowser url={data.radio.pageUrl} />}
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={revalidate}
          />
        </ActionPanel>
      }
    />
  );
}
