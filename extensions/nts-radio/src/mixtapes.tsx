import { Action, ActionPanel, Grid, Icon, Image, Toast, showToast } from "@raycast/api";
import { getFavicon, useFetch } from "@raycast/utils";
import { API_PATH, API_URL, WEB_URL } from "./constants/constants";
import { Mixtapes, MixtapesResult } from "./types";
import { play } from "./api/play";
import { getErrorMessage } from "./utils/getError";

type Actions =
  | "play"
  | "pause"
  | "togglePlayPause"
  | "like"
  | "dislike"
  | "volume0"
  | "volume33"
  | "volume66"
  | "volume100"
  | "volumeUp"
  | "volumeDown";

type Action = {
  name: Actions;
  title: string;
  description: string;
  icon?: Icon | Image.ImageLike;
  onAction: (audioStreamEndpoint?: string) => Promise<void>;
};

export default function Command() {
  const { isLoading, data } = useFetch<Mixtapes>(`${API_URL}/${API_PATH.MIXTAPES}`);

  const actions: Action[] = [
    {
      name: "play",
      title: "Play",
      description: "Play the currently paused song/episode",
      icon: Icon.Play,
      onAction: async (audioStreamEndpoint?: string) => {
        try {
          if (audioStreamEndpoint) {
            await showToast({
              style: Toast.Style.Animated,
              title: "Opening mixtape audio stream",
            });
            await play(audioStreamEndpoint);
          } else {
            await showToast({
              style: Toast.Style.Failure,
              title: "Sorry! Could not open audio stream",
            });
            console.log("Error: audio stream endpoint not provided, aborting");
          }
        } catch (err) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Sorry! Could not stop audio stream",
          });
          const error = getErrorMessage(err);
          console.log("Error playing song/episode", error);
        }
      },
    },
  ];

  return (
    <Grid isLoading={isLoading} columns={4} filtering={false} fit={Grid.Fit.Fill}>
      {data?.results?.map((result: MixtapesResult, i: number) => (
        <Grid.Item
          key={`${i} ${result.title}`}
          content={result.media?.picture_large}
          title={result.title}
          subtitle={result.subtitle}
          actions={
            <ActionPanel title={result.title}>
              {result.audio_stream_endpoint && (
                <Action
                  title="Play"
                  icon={actions[0].icon}
                  onAction={() => actions[0].onAction(result.audio_stream_endpoint)}
                />
              )}
              {result.links && result.links.length > 0 && (
                <Action.OpenInBrowser
                  title="Open in Browser"
                  url={`${WEB_URL}/infinite-mixtapes/${result.mixtape_alias}`}
                  icon={getFavicon(WEB_URL) || Icon.Globe}
                />
              )}
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
