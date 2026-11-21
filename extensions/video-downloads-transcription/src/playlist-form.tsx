import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  showToast,
} from "@raycast/api";
import { errorAction } from "./open-setup";
import { useEffect, useState } from "react";
import { ExportFormat, Settings } from "./core";
import { CaptionChoice, Playlist, inspectPlaylist } from "./playlists";
import { addToQueue } from "./queue";
import { LanguageDropdown, captionFormats } from "./transcription";
import { errorMessage } from "./video";

/** Loads a playlist or channel's videos with yt-dlp. */
export function usePlaylist(url: string | undefined, settings: Settings) {
  const [state, setState] = useState<{
    url: string;
    playlist?: Playlist;
    error?: string;
  }>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    setState({ url });
    inspectPlaylist(url, settings, controller.signal).then(
      (playlist) => !controller.signal.aborted && setState({ url, playlist }),
      (reason) => {
        if (controller.signal.aborted) return;
        setState({ url, error: errorMessage(reason) });
        showToast({
          style: Toast.Style.Failure,
          title: "Could not load playlist",
          message: errorMessage(reason),
          primaryAction: errorAction(errorMessage(reason)),
        });
      },
    );
    return () => controller.abort();
  }, [url, attempt]);

  const current = state?.url === url ? state : undefined;
  return {
    playlist: current?.playlist,
    error: current?.error,
    retry: () => setAttempt((value) => value + 1),
  };
}

/** Language, subtitle kind and format for every video in a playlist or channel. */
export function PlaylistSubtitlesForm({
  url,
  title,
  count,
  settings,
  favoriteLanguages,
  defaultLanguage,
  defaultFormat,
  onQueued,
}: {
  url: string;
  title?: string;
  count?: number;
  settings: Settings;
  favoriteLanguages: string;
  defaultLanguage: string;
  defaultFormat: ExportFormat;
  onQueued: () => void;
}) {
  return (
    <Form
      navigationTitle={title ? `Subtitles for ${title}` : "Playlist Subtitles"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Download Subtitles"
            icon={Icon.Download}
            onSubmit={async (values: {
              language: string;
              captions: CaptionChoice;
              format: ExportFormat;
            }) => {
              await addToQueue(settings, [
                {
                  title: title ?? "YouTube playlist",
                  spec: {
                    kind: "playlist",
                    playlist: { title: title ?? "", url },
                    language: values.language,
                    captions: values.captions,
                    format: values.format,
                  },
                },
              ]);
              onQueued();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Playlist"
        text={
          title
            ? `${title}${count === undefined ? "" : ` · ${count} ${count === 1 ? "video" : "videos"}`}`
            : url
        }
      />
      <LanguageDropdown
        title="Language"
        favoriteLanguages={favoriteLanguages}
        defaultLanguage={defaultLanguage}
      />
      <Form.Dropdown
        id="captions"
        title="Subtitles"
        defaultValue="any"
        info="Automatic captions are YouTube's speech recognition in the language spoken in the video. Automatic translations are slower to download, because YouTube limits how many you can get at once."
      >
        <Form.Dropdown.Item
          value="any"
          title="Creator subtitles, or automatic captions"
        />
        <Form.Dropdown.Item value="manual" title="Creator subtitles only" />
        <Form.Dropdown.Item
          value="translated"
          title="Also YouTube's automatic translations"
        />
      </Form.Dropdown>
      <Form.Dropdown id="format" title="Format" defaultValue={defaultFormat}>
        {captionFormats.map((format) => (
          <Form.Dropdown.Item
            key={format.value}
            value={format.value}
            title={format.title}
          />
        ))}
      </Form.Dropdown>
      <Form.Description text="⌘↵ adds the download to the queue. One file per video is saved in a folder named after the playlist, inside your download folder. Videos without subtitles in this language are skipped, and videos that already have a file there are not downloaded again. The queue keeps running when you close Raycast." />
    </Form>
  );
}
