import { Detail } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { readNowPlayingTrackId } from "@kud/qobuz";
import { getClient } from "./lib/client";
import { convertFromQobuz, type FromQobuzResult } from "./lib/convert";
import { coverMarkdown, TrackActions, TrackMetadata } from "./lib/track-view";

const EMPTY_MESSAGE = [
  "# Nothing playing in Qobuz",
  "",
  "Start a track in the Qobuz app, or use Open Shared Track for a Spotify, YouTube Music or Qobuz link.",
].join("\n");

const load = async (): Promise<FromQobuzResult | null> => {
  const nowPlayingId = await readNowPlayingTrackId();
  if (nowPlayingId === undefined) return null;
  return convertFromQobuz(await getClient(), nowPlayingId);
};

export default function Command() {
  const { data, isLoading } = usePromise(load, [], {
    onError: (error) => {
      showFailureToast(error, { title: "Couldn't load current track" });
    },
  });

  return (
    <Detail
      isLoading={isLoading}
      markdown={buildMarkdown(data, isLoading)}
      metadata={data ? <TrackMetadata track={data.track} links={data.links} /> : undefined}
      actions={data ? <TrackActions track={data.track} links={data.links} primary="share" /> : undefined}
    />
  );
}

const buildMarkdown = (data: FromQobuzResult | null | undefined, isLoading: boolean): string => {
  if (isLoading || data === undefined) return "";
  if (!data) return EMPTY_MESSAGE;
  return coverMarkdown(data.track, data.album);
};
