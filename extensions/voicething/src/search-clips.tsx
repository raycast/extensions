import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Icon,
  List,
  PopToRootType,
  Toast,
  closeMainWindow,
  popToRoot,
  showHUD,
  showToast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  cachedAudioFile,
  clearAudioCache,
  copyAudioFile,
  pasteAudioFile,
  removeCachedFiles,
} from "./audio";
import { errorMessage } from "./errors";
import { searchClips } from "./myinstants";
import {
  ClipState,
  decorateClips,
  loadClipState,
  recordRecent,
  removeClip,
  storedDisplayClips,
  toggleFavorite,
} from "./storage";
import { MemeClip } from "./types";

const EMPTY_STATE = {
  favorites: [],
  recents: [],
} satisfies ClipState;

export default function Command() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MemeClip[]>([]);
  const [clipState, setClipState] = useState<ClipState>(EMPTY_STATE);
  const [isLoading, setIsLoading] = useState(false);
  const [busyClipID, setBusyClipID] = useState<string>();
  const [error, setError] = useState<string>();

  const refreshStoredClips = useCallback(async () => {
    setClipState(await loadClipState());
  }, []);

  useEffect(() => {
    refreshStoredClips();
  }, [refreshStoredClips]);

  useEffect(() => {
    const trimmed = query.trim();
    setError(undefined);

    if (!trimmed) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      searchClips(trimmed, 36, controller.signal)
        .then((clips) => {
          if (!controller.signal.aborted) {
            setResults(clips);
          }
        })
        .catch((error: unknown) => {
          if (!controller.signal.aborted) {
            setResults([]);
            setError(errorMessage(error));
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsLoading(false);
          }
        });
    }, 260);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [query]);

  const displayedClips = useMemo(() => {
    if (!query.trim()) {
      return storedDisplayClips(clipState);
    }

    return decorateClips(results, clipState);
  }, [clipState, query, results]);

  const emptyTitle = error
    ? "Search Failed"
    : query.trim()
      ? "No Sounds Found"
      : "Play Meme";
  const emptyDescription =
    error ??
    (query.trim()
      ? "Try a different meme sound name."
      : "Favorites and recents appear here after you use clips.");

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search memes..."
      searchText={query}
      onSearchTextChange={setQuery}
      filtering={false}
      throttle
    >
      {displayedClips.length === 0 ? (
        <List.EmptyView
          icon={Icon.SpeakerHigh}
          title={emptyTitle}
          description={emptyDescription}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open MyInstants"
                url="https://www.myinstants.com/en/categories/memes/"
              />
              <Action
                title="Clear Audio Cache"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={async () => {
                  await clearAudioCache();
                  await showToast(Toast.Style.Success, "Audio Cache Cleared");
                }}
              />
            </ActionPanel>
          }
        />
      ) : (
        displayedClips.map((clip) => (
          <ClipListItem
            key={clip.id}
            clip={clip}
            isBusy={busyClipID === clip.id}
            onBusyChange={setBusyClipID}
            onStoredClipsChanged={refreshStoredClips}
          />
        ))
      )}
    </List>
  );
}

function ClipListItem(props: {
  clip: MemeClip;
  isBusy: boolean;
  onBusyChange: (id: string | undefined) => void;
  onStoredClipsChanged: () => Promise<void>;
}) {
  const { clip, isBusy, onBusyChange, onStoredClipsChanged } = props;
  const accessories: List.Item.Accessory[] = [];

  if (clip.isFavorite) {
    accessories.push({
      icon: { source: Icon.Star, tintColor: Color.Yellow },
      tooltip: "Favorite",
    });
  }

  if (clip.cachedAudioPath) {
    accessories.push({
      text: "Cached",
      icon: Icon.Download,
      tooltip: "Downloaded locally",
    });
  }

  if (isBusy) {
    accessories.push({
      text: "Preparing",
      icon: Icon.Hourglass,
      tooltip: "Downloading or normalizing audio",
    });
  }

  return (
    <List.Item
      id={clip.id}
      title={clip.name}
      subtitle={clip.category ?? "MyInstants"}
      icon={
        clip.isFavorite
          ? { source: Icon.Star, tintColor: Color.Yellow }
          : Icon.SpeakerHigh
      }
      keywords={clip.tags}
      accessories={accessories}
      quickLook={
        clip.cachedAudioPath
          ? { path: clip.cachedAudioPath, name: clip.name }
          : undefined
      }
      actions={
        <ClipActions
          clip={clip}
          onBusyChange={onBusyChange}
          onStoredClipsChanged={onStoredClipsChanged}
          isBusy={isBusy}
        />
      }
    />
  );
}

function ClipActions(props: {
  clip: MemeClip;
  isBusy: boolean;
  onBusyChange: (id: string | undefined) => void;
  onStoredClipsChanged: () => Promise<void>;
}) {
  const { clip, isBusy, onBusyChange, onStoredClipsChanged } = props;

  const prepare = useCallback(async () => {
    onBusyChange(clip.id);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Preparing Audio",
      message: clip.name,
    });

    try {
      const audioFile = await cachedAudioFile(clip);
      await recordRecent(clip, audioFile);
      await onStoredClipsChanged();
      await toast.hide();
      return audioFile;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could Not Prepare Audio";
      toast.message = errorMessage(error);
      throw error;
    } finally {
      onBusyChange(undefined);
    }
  }, [clip, onBusyChange, onStoredClipsChanged]);

  const handlePaste = useCallback(async () => {
    const audioFile = await prepare();
    await popToRoot({ clearSearchBar: true });
    await closeMainWindow({
      clearRootSearch: true,
      popToRootType: PopToRootType.Immediate,
    });
    await pasteAudioFile(audioFile);
    await showHUD("Played meme", {
      clearRootSearch: true,
      popToRootType: PopToRootType.Immediate,
    });
  }, [prepare]);

  const handleCopy = useCallback(async () => {
    const audioFile = await prepare();
    await copyAudioFile(audioFile);
    await showHUD("Copied audio file");
  }, [prepare]);

  const handlePreparePreview = useCallback(async () => {
    await prepare();
    await showToast(
      Toast.Style.Success,
      "Preview Ready",
      "Press Command+P again to preview in Raycast",
    );
  }, [prepare]);

  const handleFavorite = useCallback(async () => {
    const isFavorite = await toggleFavorite(clip);
    await onStoredClipsChanged();
    await showToast(
      Toast.Style.Success,
      isFavorite ? "Added Favorite" : "Removed Favorite",
      clip.name,
    );
  }, [clip, onStoredClipsChanged]);

  const handleDelete = useCallback(async () => {
    await removeClip(clip);
    await removeCachedFiles(clip);
    await onStoredClipsChanged();
    await showToast(Toast.Style.Success, "Deleted", clip.name);
  }, [clip, onStoredClipsChanged]);

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action
          title="Play Meme"
          icon={Icon.Clipboard}
          onAction={handlePaste}
          autoFocus={!isBusy}
        />
        <Action
          title="Copy Meme File"
          icon={Icon.CopyClipboard}
          onAction={handleCopy}
          shortcut={{ modifiers: ["cmd"], key: "c" }}
        />
        {clip.cachedAudioPath ? (
          <Action.ToggleQuickLook
            title="Preview in Raycast"
            icon={Icon.Play}
            shortcut={{ modifiers: ["cmd"], key: "p" }}
          />
        ) : (
          <Action
            title="Prepare Raycast Preview"
            icon={Icon.Play}
            onAction={handlePreparePreview}
            shortcut={{ modifiers: ["cmd"], key: "p" }}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section title="Library">
        <Action
          title={clip.isFavorite ? "Remove Favorite" : "Add Favorite"}
          icon={clip.isFavorite ? Icon.StarDisabled : Icon.Star}
          onAction={handleFavorite}
          shortcut={{ modifiers: ["cmd"], key: "f" }}
        />
        <Action
          title="Delete Local Clip"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          onAction={handleDelete}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Source">
        {clip.sourceURL ? (
          <Action.OpenInBrowser
            title="Open on MyInstants"
            url={clip.sourceURL}
          />
        ) : null}
        <Action.CopyToClipboard
          title="Copy Source URL"
          content={clip.sourceURL ?? clip.soundURL}
        />
        <Action.CopyToClipboard
          title="Copy Audio URL"
          content={clip.soundURL}
        />
        {clip.cachedAudioPath ? (
          <Action.ShowInFinder
            title="Show Cached File"
            path={clip.cachedAudioPath}
          />
        ) : null}
        {clip.cachedAudioPath ? (
          <Action
            title="Play Cached Meme"
            icon={Icon.Clipboard}
            onAction={handlePaste}
          />
        ) : null}
        {clip.cachedAudioPath ? (
          <Action.CopyToClipboard
            title="Copy Cached File"
            content={{ file: clip.cachedAudioPath }}
          />
        ) : null}
        {clip.cachedAudioPath ? (
          <Action
            title="Copy Cached Path"
            icon={Icon.Clipboard}
            onAction={async () => {
              await Clipboard.copy(clip.cachedAudioPath ?? "");
              await showHUD("Copied cached path");
            }}
          />
        ) : null}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
