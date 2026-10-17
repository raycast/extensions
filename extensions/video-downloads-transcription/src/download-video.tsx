import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Form,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  openExtensionPreferences,
  showInFinder,
  showToast,
  useNavigation,
} from "@raycast/api";
import { readFileSync } from "node:fs";
import { basename, dirname } from "node:path";
import { useMemo, useRef, useState } from "react";
import { preferences } from "./preferences";
import {
  Caption,
  ExportFormat,
  MediaFormat,
  defaultWhisperLanguage,
  downloadCaption,
  favoriteScore,
  formatSize,
  inspectMedia,
  isMediaLink,
  languageLabel,
  localFileInfo,
  isCanceled,
  localPath,
  mediaUrl,
  rankFavorites,
  formatDuration,
  whisperLanguageName,
  youtubeCollectionUrl,
  youtubePlaylistOf,
  youtubeThumbnail,
} from "./core";
import { PlaylistSubtitlesForm, usePlaylist } from "./playlist-form";
import { playlistFolderName } from "./playlists";
import { cancelJob, isActive } from "./jobs";
import {
  QueueList,
  addToQueue,
  copyText,
  fileJobs,
  jobSubtitle,
  jobToast,
  savesTranscripts,
  useQueue,
} from "./queue";
import {
  TranscribeForm,
  captionFormats,
  formatTitle,
  useFavoriteLanguages,
  useWhisperModels,
} from "./transcription";
import {
  Fact,
  detailMarkdown,
  errorMessage,
  mediaFormats,
  useLinkSearch,
  useVideo,
  videoDetail,
} from "./video";
import { TranscriptionOptions, modelName } from "./whisper";
import { SetupList, useMissingTools } from "./setup-list";
import { useYtDlpUpdate } from "./ytdlp-update";

export { runQueueWorker } from "./jobs";

/** The video URL for search text that is a link, or undefined for filter text and unfinished links. */
function typedLink(text: string): { isLink: boolean; url?: string } {
  if (!/^[a-z][a-z\d+.-]*:\/\//i.test(text) && !isMediaLink(text))
    return { isLink: false };
  try {
    return { isLink: true, url: mediaUrl(text) };
  } catch {
    return { isLink: true };
  }
}

export default function Command() {
  const { push, pop } = useNavigation();
  const settings = preferences();
  const [url, setUrl] = useState<string>();
  const favoriteLanguages = useFavoriteLanguages(settings);
  const search = useLinkSearch(
    (link) => setUrl(mediaUrl(link)),
    (text) => {
      const path = localPath(text);
      if (path && localFileInfo(path)) push(transcribeForm(path));
    },
    { browserTab: settings.browserTab !== false },
  );
  const collectionUrl = url ? youtubeCollectionUrl(url) : undefined;
  const state = useVideo(
    collectionUrl ? undefined : url,
    settings,
    inspectMedia,
  );
  const playlistState = usePlaylist(collectionUrl, settings);
  const { playlist } = playlistState;
  const { video, preview, error } = state;
  const [downloadCount, setDownloadCount] = useState(0);
  const busy = downloadCount > 0;
  const [lastFile, setLastFile] = useState<string>();
  const [lastText, setLastText] = useState<{ paths: string[]; noun: string }>();
  const showQueue = () => push(<QueueList settings={settings} />);
  const queue = useQueue(settings, (job) => {
    if (job.outputs?.length) {
      setLastFile(job.outputs[0]);
      if (savesTranscripts(job))
        setLastText({ paths: job.outputs, noun: "Transcript" });
    }
    jobToast(job, showQueue);
  });
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("raw");
  const ytDlp = useYtDlpUpdate(settings);
  const missingTools = useMissingTools(settings, ["yt-dlp", "ffmpeg"]);
  const downloads = useRef(new Set<AbortController>());

  /**
   * Downloads a caption with a toast that can cancel it. With `copy`, its text
   * is copied to the clipboard as soon as it is saved.
   */
  async function save(caption: Caption, format: ExportFormat, copy = false) {
    if (!video) return;
    const controller = new AbortController();
    downloads.current.add(controller);
    setDownloadCount(downloads.current.size);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Downloading ${caption.language} ${formatTitle(format)}…`,
      primaryAction: {
        title: "Cancel Download",
        onAction: () => controller.abort(),
      },
    });
    try {
      const path = await downloadCaption(
        video,
        caption,
        format,
        settings,
        (message) => {
          toast.title = message;
        },
        controller.signal,
      );
      setLastFile(path);
      setLastText({ paths: [path], noun: "Subtitle" });
      if (copy) await Clipboard.copy(readFileSync(path, "utf8"));
      const showFile = {
        title: "Show in Finder",
        onAction: () => showInFinder(path),
      };
      toast.style = Toast.Style.Success;
      toast.title = copy ? "Subtitle saved and copied" : "Subtitle saved";
      toast.message = path;
      toast.primaryAction = copy
        ? showFile
        : {
            title: "Copy Text",
            shortcut: Keyboard.Shortcut.Common.Copy,
            onAction: () => copyText([path], "Subtitle"),
          };
      toast.secondaryAction = copy ? undefined : showFile;
    } catch (error) {
      toast.primaryAction = undefined;
      if (isCanceled(error)) {
        toast.style = Toast.Style.Success;
        toast.title = "Download canceled";
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Download failed";
        toast.message = errorMessage(error);
      }
    } finally {
      downloads.current.delete(controller);
      setDownloadCount(downloads.current.size);
    }
  }

  function media(format: MediaFormat) {
    if (!video) return;
    const { id, title, url, items, isLive, photos } = video;
    addToQueue(
      settings,
      [
        {
          title,
          spec: {
            kind: "media",
            video: { id, title, url, items, isLive, photos },
            format,
          },
        },
      ],
      showQueue,
    );
  }

  function downloadPhotos() {
    if (!video) return;
    const { id, title, url, items, isLive, photos } = video;
    addToQueue(
      settings,
      [
        {
          title,
          spec: {
            kind: "images",
            video: { id, title, url, items, isLive, photos },
          },
        },
      ],
      showQueue,
    );
  }

  function queueFiles(paths: string[], options: TranscriptionOptions) {
    addToQueue(settings, fileJobs(paths, options), showQueue);
  }

  function queueVideo(options: TranscriptionOptions) {
    if (!video) return;
    const { id, title, url, items, isLive, photos } = video;
    addToQueue(
      settings,
      [
        {
          title,
          spec: {
            kind: "video",
            video: { id, title, url, items, isLive, photos },
            options,
          },
        },
      ],
      showQueue,
    );
  }

  const { defaultModel } = useWhisperModels(settings);
  const whisperLanguage = defaultWhisperLanguage(
    favoriteLanguages.value,
    settings.whisperLanguage,
  );

  function transcribeForm(path: string) {
    return (
      <TranscribeForm
        initialPaths={[path]}
        settings={settings}
        favoriteLanguages={favoriteLanguages.value}
        defaultLanguage={whisperLanguage}
        onTranscribe={(paths, options) => {
          pop();
          queueFiles(paths, options);
        }}
      />
    );
  }

  function videoTranscribeForm() {
    return (
      <TranscribeForm
        videoTitle={video?.title}
        settings={settings}
        favoriteLanguages={favoriteLanguages.value}
        defaultLanguage={whisperLanguage}
        defaultFormat={selectedFormat}
        note={
          video?.items
            ? `This post has ${video.items} videos. Each one is transcribed and saved as its own file.`
            : undefined
        }
        onTranscribe={(_, options) => {
          pop();
          queueVideo(options);
        }}
      />
    );
  }

  const whisperTitle =
    whisperLanguage === "auto"
      ? "Transcribe with Language Detection"
      : `Transcribe in ${whisperLanguageName(whisperLanguage)}`;

  const query = search.text.trim();
  const filePath = localPath(query);
  const fileInfo = useMemo(
    () => (filePath ? localFileInfo(filePath) : undefined),
    [filePath],
  );
  const fileJob = queue.jobs.find(
    (job) =>
      isActive(job) && job.spec.kind === "file" && job.spec.path === filePath,
  );
  const videoJob = queue.jobs.find(
    (job) =>
      isActive(job) &&
      job.spec.kind === "video" &&
      job.spec.video.id === video?.id,
  );
  const mediaJob = (format: MediaFormat) =>
    queue.jobs.find(
      (job) =>
        isActive(job) &&
        job.spec.kind === "media" &&
        job.spec.video.id === video?.id &&
        job.spec.format === format,
    );
  const photosJob = queue.jobs.find(
    (job) =>
      isActive(job) &&
      job.spec.kind === "images" &&
      job.spec.video.id === video?.id,
  );
  const playlistMediaJob = (format: MediaFormat) =>
    queue.jobs.find(
      (job) =>
        isActive(job) &&
        job.spec.kind === "playlist-media" &&
        job.spec.playlist.url === collectionUrl &&
        job.spec.format === format,
    );
  const cancelAction = (job: (typeof queue.jobs)[number]) => (
    <Action
      title={savesTranscripts(job) ? "Cancel Transcription" : "Cancel Download"}
      icon={Icon.XMarkCircle}
      style={Action.Style.Destructive}
      onAction={() => {
        cancelJob(queue.folder, job);
        queue.refresh();
      }}
    />
  );
  const link = filePath ? { isLink: false } : typedLink(query);
  const listUrl =
    url && !collectionUrl && !filePath ? youtubePlaylistOf(query) : undefined;

  const videoCount = playlist
    ? `${playlist.entries.length} ${playlist.entries.length === 1 ? "Video" : "Videos"}`
    : "";

  function playlistDetail(note: string, facts: Fact[] = []) {
    return (
      <List.Item.Detail
        markdown={detailMarkdown({
          image: playlist?.thumbnail,
          title: playlist?.title,
          note,
          facts: [
            ...(playlist?.channel
              ? [{ title: "Channel", text: playlist.channel }]
              : []),
            { title: "Videos", text: String(playlist?.entries.length ?? 0) },
            ...facts,
          ],
        })}
      />
    );
  }

  /** Queues every video in the playlist as MP3, M4A or MP4, asking first for large ones. */
  async function playlistMedia(format: MediaFormat) {
    if (!playlist || !collectionUrl) return;
    const count = playlist.entries.length;
    if (
      count > 20 &&
      !(await confirmAlert({
        title: `Download ${count} videos as ${format.toUpperCase()}?`,
        message: `They're saved in a folder named “${playlistFolderName(playlist.title)}” in your download folder. This can take a long time${format === "mp4" ? " and use a lot of disk space" : ""}.`,
        primaryAction: { title: "Download" },
      }))
    )
      return;
    addToQueue(
      settings,
      [
        {
          title: playlist.title,
          spec: {
            kind: "playlist-media",
            playlist: { title: playlist.title, url: collectionUrl },
            format,
          },
        },
      ],
      showQueue,
    );
  }

  function playlistForm(target: string, title?: string, count?: number) {
    return (
      <PlaylistSubtitlesForm
        url={target}
        title={title}
        count={count}
        settings={settings}
        favoriteLanguages={favoriteLanguages.value}
        defaultLanguage={whisperLanguage}
        defaultFormat={selectedFormat}
        onQueued={pop}
      />
    );
  }
  const pendingUrl = link.url !== url ? link.url : undefined;
  const filter = link.isLink || filePath ? "" : query.toLocaleLowerCase();
  const matches = (...texts: string[]) =>
    !filter || texts.some((text) => text.toLocaleLowerCase().includes(filter));

  const captions = (filePath ? [] : (video?.captions ?? [])).filter(
    (caption) =>
      matches(languageLabel(caption.language), caption.language) ||
      favoriteScore(caption, filter) >= 60,
  );
  const { favorites, suggestions } = rankFavorites(
    [...captions].sort(
      (a, b) =>
        Number(b.kind === "manual") - Number(a.kind === "manual") ||
        Number(/orig/i.test(b.language)) - Number(/orig/i.test(a.language)) ||
        languageLabel(a.language).localeCompare(languageLabel(b.language)),
    ),
    (caption) => [caption.language, languageLabel(caption.language)],
    favoriteLanguages.value,
  );
  const featured = new Set([...favorites, ...suggestions]);
  const manual = captions.filter(
    (caption) => caption.kind === "manual" && !featured.has(caption),
  );
  const automatic = captions.filter(
    (caption) => caption.kind === "automatic" && !featured.has(caption),
  );
  const mediaItems = mediaFormats.filter(({ value, subtitle }) =>
    matches(value, subtitle, value === "mp4" ? "video" : "audio"),
  );

  const updateAction = ytDlp.outdated && (
    <Action
      // yt-dlp is always written in lowercase
      // eslint-disable-next-line @raycast/prefer-title-case
      title="Update yt-dlp"
      icon={Icon.ArrowClockwise}
      onAction={ytDlp.update}
    />
  );
  const updateNote = ytDlp.outdated
    ? `yt-dlp ${ytDlp.current} is out of date, and YouTube downloads often fail with old versions. Version ${ytDlp.latest} is available.`
    : undefined;
  const moreActions = (
    <ActionPanel.Section>
      {busy && (
        <Action
          title={downloadCount > 1 ? "Cancel Downloads" : "Cancel Download"}
          icon={Icon.XMarkCircle}
          style={Action.Style.Destructive}
          onAction={() =>
            downloads.current.forEach((controller) => controller.abort())
          }
        />
      )}
      {lastText && (
        <Action
          title={`Copy Last ${lastText.noun}`}
          icon={Icon.CopyClipboard}
          onAction={() => copyText(lastText.paths, lastText.noun)}
        />
      )}
      {lastFile && (
        <Action
          title="Show Last File in Finder"
          icon={Icon.Finder}
          onAction={() => showInFinder(lastFile)}
        />
      )}
      <Action.Push
        title="Show Queue"
        icon={Icon.List}
        target={<QueueList settings={settings} />}
      />
      <Action.Push
        title="Manage Tools and Models"
        icon={Icon.Download}
        shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
        target={<SetupList settings={settings} />}
      />
      <Action.Push
        title="Edit Favorite Languages"
        icon={Icon.Star}
        target={
          <FavoriteLanguagesForm
            value={favoriteLanguages.value}
            onSave={favoriteLanguages.save}
          />
        }
      />
      <Action
        title="Open Extension Preferences"
        icon={Icon.Gear}
        onAction={openExtensionPreferences}
      />
    </ActionPanel.Section>
  );
  const item = (caption: Caption) => (
    <List.Item
      key={`${caption.kind}-${caption.language}`}
      title={languageLabel(caption.language)}
      subtitle={caption.kind === "manual" ? "Creator" : "Automatic"}
      icon={caption.kind === "manual" ? Icon.Text : Icon.Wand}
      detail={videoDetail(state, [
        { title: "Language", text: caption.language },
        {
          title: "Captions",
          text:
            caption.kind === "manual"
              ? "Creator captions"
              : "YouTube automatic captions",
        },
        { title: "Format", text: formatTitle(selectedFormat) },
      ])}
      actions={
        <ActionPanel>
          <Action
            title={`Download ${formatTitle(selectedFormat)}`}
            icon={Icon.Download}
            onAction={() => save(caption, selectedFormat)}
          />
          <Action
            title="Download and Copy Text"
            icon={Icon.CopyClipboard}
            shortcut={Keyboard.Shortcut.Common.Copy}
            onAction={() => save(caption, selectedFormat, true)}
          />
          <ActionPanel.Submenu
            title="Other Caption Formats"
            icon={Icon.Document}
          >
            {captionFormats
              .filter((item) => item.value !== selectedFormat)
              .map((item) => (
                <Action
                  key={item.value}
                  title={`Download ${item.title}`}
                  onAction={() => save(caption, item.value)}
                />
              ))}
          </ActionPanel.Submenu>
          {moreActions}
        </ActionPanel>
      }
    />
  );

  return (
    <List
      isLoading={
        busy ||
        Boolean(
          url &&
          !filePath &&
          (collectionUrl
            ? !playlist && !playlistState.error
            : !video && !error),
        )
      }
      isShowingDetail={Boolean(url || pendingUrl || filePath)}
      filtering={false}
      searchText={search.text}
      onSearchTextChange={search.onChange}
      navigationTitle={
        playlist?.title || video?.title || preview.title || "Download Video"
      }
      searchBarPlaceholder={
        url
          ? "Filter languages, or paste another link or file path…"
          : "Paste a YouTube, Instagram or X link, or a file path…"
      }
      searchBarAccessory={
        url && !filePath ? (
          <List.Dropdown
            tooltip="Caption Format"
            value={selectedFormat}
            onChange={(value) => setSelectedFormat(value as ExportFormat)}
          >
            {captionFormats.map((item) => (
              <List.Dropdown.Item
                key={item.value}
                title={item.title}
                value={item.value}
              />
            ))}
          </List.Dropdown>
        ) : undefined
      }
    >
      <List.EmptyView
        icon={url ? Icon.MagnifyingGlass : Icon.Link}
        title={url ? "No matching languages or formats" : "Paste a video link"}
        description={
          url
            ? "Clear the search to see everything, or paste another link."
            : missingTools.length
              ? `${missingTools.map((tool) => tool.name).join(" and ")} ${missingTools.length > 1 ? "aren't" : "isn't"} installed yet. Press ↵ to install ${missingTools.length > 1 ? "them" : "it"}.`
              : updateNote
                ? `${updateNote} Press ↵ to update it.`
                : "YouTube, Instagram, X, TikTok and other video links load as soon as you paste them, or when a link is in your clipboard as the command opens. For other sites, paste the link and press Return. To transcribe an audio or video file, paste its full path."
        }
        actions={
          <ActionPanel>
            {!url && missingTools.length > 0 && (
              <Action.Push
                title="Install Missing Tools"
                icon={Icon.Download}
                target={<SetupList settings={settings} />}
              />
            )}
            {!url && updateAction}
            {moreActions}
          </ActionPanel>
        }
      />
      {url && updateNote && (
        <List.Section title="yt-dlp Update">
          <List.Item
            title="Update yt-dlp"
            subtitle={`${ytDlp.current} → ${ytDlp.latest}`}
            icon={{ source: Icon.ArrowClockwise, tintColor: Color.Orange }}
            detail={
              <List.Item.Detail
                markdown={detailMarkdown({
                  title: "Update yt-dlp",
                  note: updateNote,
                })}
              />
            }
            actions={
              <ActionPanel>
                {updateAction}
                {moreActions}
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      {pendingUrl && (
        <List.Item
          title="Search This Link"
          subtitle={pendingUrl}
          icon={Icon.MagnifyingGlass}
          detail={videoDetail(
            {
              preview: {
                thumbnail: youtubeThumbnail(pendingUrl),
                title: "Press Return to search this link",
              },
            },
            [{ title: "Link", text: pendingUrl }],
          )}
          actions={
            <ActionPanel>
              <Action
                title="Search This Link"
                icon={Icon.MagnifyingGlass}
                onAction={() => setUrl(pendingUrl)}
              />
              {moreActions}
            </ActionPanel>
          }
        />
      )}
      {filePath && (
        <List.Section
          title={
            fileInfo?.isFile === false ? "Transcribe Folder" : "Transcribe File"
          }
        >
          <List.Item
            title={basename(filePath) || filePath}
            subtitle={
              fileJob
                ? jobSubtitle(fileJob)
                : fileInfo
                  ? dirname(filePath)
                  : "Not found"
            }
            icon={
              !fileInfo
                ? Icon.Warning
                : fileInfo.isFile
                  ? Icon.Microphone
                  : Icon.Folder
            }
            detail={
              <List.Item.Detail
                markdown={detailMarkdown(
                  fileInfo && !fileInfo.isFile
                    ? {
                        title: basename(filePath),
                        note: "Press ↵ to choose the spoken language, output and model. Audio and video files in this folder and its subfolders are added to the transcription queue.",
                        facts: [{ title: "Folder", text: filePath }],
                      }
                    : fileInfo
                      ? {
                          title: basename(filePath),
                          note: "Press ↵ to choose the spoken language and output, then ⌘↵ to transcribe. Press ⌘↵ here to transcribe with the settings below.",
                          facts: [
                            { title: "Folder", text: dirname(filePath) },
                            { title: "Size", text: formatSize(fileInfo.size) },
                            {
                              title: "Modified",
                              text: fileInfo.modified
                                .toISOString()
                                .slice(0, 10),
                            },
                            {
                              title: "Spoken Language",
                              text: whisperLanguageName(whisperLanguage),
                            },
                            { title: "Output", text: formatTitle("raw") },
                            {
                              title: "Model",
                              text: defaultModel
                                ? modelName(defaultModel)
                                : "Not found",
                            },
                          ],
                        }
                      : {
                          title: "Not found",
                          note: "Enter the full path of an audio or video file or a folder, for example `/Users/you/Music/interview.m4a`.",
                          facts: [{ title: "Path", text: filePath }],
                        },
                )}
              />
            }
            actions={
              <ActionPanel>
                {fileJob && cancelAction(fileJob)}
                {fileInfo && (
                  <>
                    <Action.Push
                      title="Choose Language and Output"
                      icon={Icon.Microphone}
                      target={transcribeForm(filePath)}
                    />
                    {fileInfo.isFile && (
                      <Action
                        title={whisperTitle}
                        icon={Icon.Waveform}
                        onAction={() =>
                          queueFiles([filePath], {
                            language: whisperLanguage,
                            format: "raw",
                          })
                        }
                      />
                    )}
                    <Action.ShowInFinder path={filePath} />
                  </>
                )}
                {moreActions}
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      {collectionUrl &&
        !filePath &&
        (playlist ? (
          <>
            <List.Section
              title={
                collectionUrl.includes("/playlist?") ? "Playlist" : "Channel"
              }
            >
              <List.Item
                title={`Download Subtitles for ${videoCount}`}
                subtitle={playlist.title}
                icon={Icon.Download}
                detail={playlistDetail(
                  "Press ↵ to choose the language and format. One file per video is saved in a folder named after the playlist.",
                )}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="Choose Language and Format"
                      icon={Icon.Download}
                      target={playlistForm(
                        collectionUrl,
                        playlist.title,
                        playlist.entries.length,
                      )}
                    />
                    <Action.OpenInBrowser url={collectionUrl} />
                    {moreActions}
                  </ActionPanel>
                }
              />
              {mediaItems.map(({ value, subtitle }) => {
                const job = playlistMediaJob(value);
                return (
                  <List.Item
                    key={value}
                    title={`Download ${value.toUpperCase()} for ${videoCount}`}
                    subtitle={job ? jobSubtitle(job) : subtitle}
                    icon={value === "mp4" ? Icon.Video : Icon.Music}
                    accessories={
                      job?.percent !== undefined
                        ? [{ tag: `${job.percent}%` }]
                        : undefined
                    }
                    detail={playlistDetail(
                      `Press ↵ to add the download to the queue. Every video is saved as ${value.toUpperCase()} in a folder named after the playlist, and videos already in that folder are skipped.`,
                      [{ title: "Quality", text: subtitle }],
                    )}
                    actions={
                      <ActionPanel>
                        {job && cancelAction(job)}
                        <Action
                          title={`Download ${value.toUpperCase()} for ${videoCount}`}
                          icon={Icon.Download}
                          onAction={() => playlistMedia(value)}
                        />
                        <Action.OpenInBrowser url={collectionUrl} />
                        {moreActions}
                      </ActionPanel>
                    }
                  />
                );
              })}
            </List.Section>
            <List.Section
              title="Videos"
              subtitle={
                playlist.entries.length > 300
                  ? `First 300 of ${playlist.entries.length}`
                  : String(playlist.entries.length)
              }
            >
              {playlist.entries.slice(0, 300).map((entry) => (
                <List.Item
                  key={entry.id}
                  title={entry.title}
                  subtitle={
                    entry.duration !== undefined
                      ? formatDuration(entry.duration)
                      : undefined
                  }
                  icon={Icon.Video}
                  detail={
                    <List.Item.Detail
                      markdown={detailMarkdown({
                        image: `https://i.ytimg.com/vi/${entry.id}/mqdefault.jpg`,
                        title: entry.title,
                        note: "Press ↵ to open this video's subtitles, audio and video.",
                      })}
                    />
                  }
                  actions={
                    <ActionPanel>
                      <Action
                        title="Open Video"
                        icon={Icon.ArrowRight}
                        onAction={() => search.open(entry.url)}
                      />
                      <Action.OpenInBrowser url={entry.url} />
                      {moreActions}
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          </>
        ) : (
          <List.Item
            title={
              playlistState.error
                ? "Could not load playlist"
                : "Loading videos…"
            }
            subtitle={playlistState.error}
            icon={playlistState.error ? Icon.Warning : Icon.MagnifyingGlass}
            detail={
              <List.Item.Detail
                markdown={detailMarkdown({
                  title: playlistState.error
                    ? "Could not load playlist"
                    : "Loading videos…",
                  note: playlistState.error
                    ? playlistState.error
                    : "Large channels can take a while to list.",
                  facts: [{ title: "Link", text: collectionUrl }],
                })}
              />
            }
            actions={
              <ActionPanel>
                {playlistState.error && updateAction}
                {playlistState.error && (
                  <Action
                    title="Try Again"
                    icon={Icon.RotateClockwise}
                    onAction={playlistState.retry}
                  />
                )}
                {moreActions}
              </ActionPanel>
            }
          />
        ))}
      {url && !collectionUrl && !video && !filePath && (
        <List.Item
          title={error ? "Could not inspect video" : "Loading video…"}
          subtitle={error}
          icon={error ? Icon.Warning : Icon.MagnifyingGlass}
          detail={videoDetail(state)}
          actions={
            <ActionPanel>
              {error && updateAction}
              {error && (
                <Action
                  title="Try Again"
                  icon={Icon.RotateClockwise}
                  onAction={state.retry}
                />
              )}
              {moreActions}
            </ActionPanel>
          }
        />
      )}
      {video && listUrl && (
        <List.Section title="Playlist">
          <List.Item
            title="Download Subtitles for Whole Playlist"
            subtitle="This link is part of a playlist"
            icon={Icon.List}
            detail={videoDetail(state, [{ title: "Playlist", text: listUrl }])}
            actions={
              <ActionPanel>
                <Action
                  title="Open Playlist"
                  icon={Icon.List}
                  onAction={() => search.open(listUrl)}
                />
                <Action.Push
                  title="Choose Language and Format"
                  icon={Icon.Download}
                  target={playlistForm(listUrl)}
                />
                {moreActions}
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      {video &&
        !filePath &&
        !video.captions.length &&
        !video.noVideo &&
        matches("whisper transcribe") && (
          <List.Section title="No Captions Available">
            <List.Item
              title="Transcribe with Whisper"
              subtitle={
                videoJob
                  ? jobSubtitle(videoJob)
                  : defaultModel
                    ? `Local ${modelName(defaultModel)}`
                    : "Local"
              }
              icon={Icon.Microphone}
              detail={videoDetail(state, [
                {
                  title: "Model",
                  text: defaultModel ? modelName(defaultModel) : "Not found",
                },
                {
                  title: "Spoken Language",
                  text: whisperLanguageName(whisperLanguage),
                },
                { title: "Output", text: formatTitle(selectedFormat) },
                ...(video.items
                  ? [
                      {
                        title: "Videos",
                        text: `${video.items}, each transcribed to its own file`,
                      },
                    ]
                  : []),
              ])}
              actions={
                <ActionPanel>
                  {videoJob && cancelAction(videoJob)}
                  <Action.Push
                    title="Choose Language and Output"
                    icon={Icon.Microphone}
                    target={videoTranscribeForm()}
                  />
                  <Action
                    title={whisperTitle}
                    icon={Icon.Waveform}
                    onAction={() =>
                      queueVideo({
                        language: whisperLanguage,
                        format: selectedFormat,
                      })
                    }
                  />
                  {moreActions}
                </ActionPanel>
              }
            />
          </List.Section>
        )}
      {favorites.length > 0 && (
        <List.Section
          title="Favorite Languages"
          subtitle={favoriteLanguages.value}
        >
          {favorites.map(item)}
        </List.Section>
      )}
      {suggestions.length > 0 && (
        <List.Section
          title="Suggested Languages"
          subtitle="Closest matches to your favorites"
        >
          {suggestions.map(item)}
        </List.Section>
      )}
      {video && !filePath && !video.noVideo && mediaItems.length > 0 && (
        <List.Section title="Audio & Video">
          {mediaItems.map(({ value, subtitle }) => {
            const job = mediaJob(value);
            return (
              <List.Item
                key={value}
                title={`Download ${value.toUpperCase()}`}
                subtitle={
                  (job && jobSubtitle(job)) ||
                  (video.isLive
                    ? "Live stream, available after it ends"
                    : video.items
                      ? `${subtitle} · ${video.items} videos`
                      : subtitle)
                }
                icon={value === "mp4" ? Icon.Video : Icon.Music}
                detail={videoDetail(state, [
                  { title: "Format", text: value.toUpperCase() },
                  { title: "Quality", text: subtitle },
                  ...(video.items
                    ? [
                        {
                          title: "Videos",
                          text: `${video.items}, each saved as its own file`,
                        },
                      ]
                    : []),
                ])}
                actions={
                  <ActionPanel>
                    {job && cancelAction(job)}
                    <Action
                      title={`Download ${value.toUpperCase()}`}
                      icon={Icon.Download}
                      onAction={() => media(value)}
                    />
                    {moreActions}
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
      {video?.images && !filePath && matches("photos images pictures") && (
        <List.Section title="Photos">
          <List.Item
            title={
              video.images.length > 1
                ? `Download ${video.images.length} Photos`
                : "Download Photo"
            }
            subtitle={photosJob ? jobSubtitle(photosJob) : "Full resolution"}
            icon={Icon.Image}
            detail={
              <List.Item.Detail
                markdown={detailMarkdown({
                  // X serves a smaller size for the preview.
                  image: video.images[0].url.replace(
                    /name=orig$/,
                    "name=small",
                  ),
                  title: video.title,
                  facts: [
                    ...(video.channel
                      ? [{ title: "Account", text: video.channel }]
                      : []),
                    {
                      title: "Photos",
                      text:
                        video.images.length > 1
                          ? `${video.images.length}, each saved as its own file`
                          : "1",
                    },
                    ...(video.images[0].width && video.images[0].height
                      ? [
                          {
                            title: "Size",
                            text: `${video.images[0].width} × ${video.images[0].height}${video.images.length > 1 ? " (first photo)" : ""}`,
                          },
                        ]
                      : []),
                  ],
                })}
              />
            }
            actions={
              <ActionPanel>
                {photosJob && cancelAction(photosJob)}
                <Action
                  title={
                    video.images.length > 1
                      ? "Download Photos"
                      : "Download Photo"
                  }
                  icon={Icon.Download}
                  onAction={downloadPhotos}
                />
                {moreActions}
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      {manual.length > 0 && (
        <List.Section
          title="Creator Captions"
          subtitle={`${manual.length} languages`}
        >
          {manual.map(item)}
        </List.Section>
      )}
      {automatic.length > 0 && (
        <List.Section
          title="Automatic Captions"
          subtitle={`${automatic.length} languages`}
        >
          {automatic.map(item)}
        </List.Section>
      )}
    </List>
  );
}

function FavoriteLanguagesForm({
  value,
  onSave,
}: {
  value: string;
  onSave: (value: string) => void;
}) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle="Favorite Languages"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Favorite Languages"
            icon={Icon.Star}
            onSubmit={(values: { favoriteLanguages: string }) => {
              onSave(values.favoriteLanguages.trim());
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="favoriteLanguages"
        title="Favorite Languages"
        placeholder="Serbian, English"
        defaultValue={value}
        autoFocus
        info="Comma-separated names or codes. Matches ignore case and (orig)."
      />
    </Form>
  );
}
