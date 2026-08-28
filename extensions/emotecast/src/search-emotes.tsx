import {
  Action,
  ActionPanel,
  Clipboard,
  Grid,
  Icon,
  Toast,
  closeMainWindow,
  environment,
  getPreferenceValues,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise, useFrecencySorting } from "@raycast/utils";
import { join } from "node:path";
import { useRef, useState } from "react";
import { ToolMissingError } from "./io/tools";
import { prepareEmoteFile } from "./io/prepare";
import { ToolMissing } from "./tool-missing";
import { DEFAULT_SOURCE, SOURCES, sourceById } from "./sources";
import { EMOJI_HEIGHT, type Emote, STICKER_HEIGHT } from "./types";

type Preferences = {
  showNsfw: boolean;
  ffmpegPath: string;
  magickPath: string;
};

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const { push } = useNavigation();

  const [sourceId, setSourceId] = useState<string>(DEFAULT_SOURCE);
  const [searchText, setSearchText] = useState("");
  const [animatedOnly, setAnimatedOnly] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const abortable = useRef<AbortController>(null);

  const source = sourceById(sourceId);
  const trimmed = searchText.trim();

  const { data, isLoading } = useCachedPromise(
    (query: string, id: string, onlyAnimated: boolean) => {
      const active = sourceById(id);
      if (query.length < active.minQueryLength)
        return Promise.resolve<Emote[]>([]);
      return active.search(
        { query, animatedOnly: onlyAnimated },
        abortable.current?.signal,
      );
    },
    [trimmed, sourceId, animatedOnly],
    { keepPreviousData: true, initialData: [] as Emote[], abortable },
  );

  const visible = preferences.showNsfw
    ? data
    : data.filter((emote) => !emote.nsfw);
  const { data: emotes, visitItem } = useFrecencySorting(visible, {
    key: (emote) => emote.key,
  });

  async function paste(emote: Emote, height: number) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Preparing ${emote.name}`,
    });
    try {
      const file = await prepareEmoteFile(emote, height, {
        cacheDir: join(environment.supportPath, "emotes"),
        tools: {
          ffmpeg: preferences.ffmpegPath,
          magick: preferences.magickPath,
        },
      });
      await visitItem(emote);
      await toast.hide();
      await closeMainWindow();
      await Clipboard.paste({ file });
    } catch (error) {
      await toast.hide();
      if (error instanceof ToolMissingError) {
        push(<ToolMissing tool={error.tool} />);
        return;
      }
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not paste emote",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Grid
      columns={8}
      inset={Grid.Inset.Small}
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      onSelectionChange={setSelectedKey}
      throttle
      searchBarPlaceholder={`Search ${source.title} emotes`}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Source"
          value={sourceId}
          onChange={setSourceId}
          storeValue
        >
          {SOURCES.map((entry) => (
            <Grid.Dropdown.Item
              key={entry.id}
              title={entry.title}
              value={entry.id}
            />
          ))}
        </Grid.Dropdown>
      }
    >
      {trimmed.length < source.minQueryLength ? (
        <Grid.EmptyView
          icon={Icon.MagnifyingGlass}
          title={`Type at least ${source.minQueryLength} character${source.minQueryLength > 1 ? "s" : ""}`}
          description={`${source.title} needs a longer query to search.`}
        />
      ) : (
        emotes.map((emote) => {
          const concealed = emote.nsfw && selectedKey !== emote.key;
          return (
            <Grid.Item
              key={emote.key}
              id={emote.key}
              title={emote.name}
              content={
                concealed
                  ? { source: Icon.EyeDisabled }
                  : { source: emote.preview, fallback: Icon.Image }
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Paste as Emoji"
                    icon={Icon.Text}
                    onAction={() => paste(emote, EMOJI_HEIGHT)}
                  />
                  <Action
                    title="Paste as Sticker"
                    icon={Icon.Image}
                    shortcut={{ modifiers: ["shift"], key: "enter" }}
                    onAction={() => paste(emote, STICKER_HEIGHT)}
                  />
                  <Action
                    title={
                      animatedOnly ? "Show All Emotes" : "Show Animated Only"
                    }
                    icon={Icon.Filter}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                    onAction={() => setAnimatedOnly((value) => !value)}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </Grid>
  );
}
