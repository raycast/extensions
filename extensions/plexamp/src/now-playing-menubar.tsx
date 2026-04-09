import { Icon, LaunchType, MenuBarExtra, launchCommand, openExtensionPreferences } from "@raycast/api";
import { useMemo } from "react";

import { formatNowPlayingMenuBarTitle } from "./format";
import { getImageUrl, getMetadataByKeyForTimeline, getMetadataByRatingKey, getTimeline } from "./plex";
import type { MetadataItem, TimelineInfo } from "./types";
import { useAsyncValue } from "./use-async-value";

interface MenuBarState {
  timeline: TimelineInfo;
  current?: MetadataItem;
  imageUrl?: string;
}

async function loadNowPlaying(): Promise<MenuBarState> {
  const timeline = await getTimeline();
  let current: MetadataItem | undefined;

  if (timeline.key) {
    try {
      current = await getMetadataByKeyForTimeline(timeline, timeline.key);
    } catch {
      current = undefined;
    }
  }

  if (!current && timeline.ratingKey) {
    try {
      current = await getMetadataByRatingKey(timeline.ratingKey);
    } catch {
      current = undefined;
    }
  }

  const imageUrl = current?.thumb ? getImageUrl(current.thumb) : undefined;

  return { timeline, current, imageUrl };
}

const initialState: MenuBarState = { timeline: { state: "loading" } };

export default function Command() {
  const { value: state, isLoading, error, reload } = useAsyncValue(
    loadNowPlaying,
    "menubar",
    initialState,
    "menubar-now-playing",
  );

  const title = useMemo(() => formatNowPlayingMenuBarTitle(state.current), [state.current]);
  const icon = state.imageUrl ? { source: state.imageUrl } : Icon.Music;
  const subtitle =
    state.current?.type === "track"
      ? [state.current.parentTitle, state.current.grandparentTitle].filter(Boolean).join(" - ")
      : state.current?.type === "album"
        ? state.current.parentTitle
        : undefined;

  return (
    <MenuBarExtra isLoading={isLoading} icon={icon} title={title} tooltip={error ?? title}>
      <MenuBarExtra.Section title="Playback">
        <MenuBarExtra.Item title={title} icon={icon} />
        {subtitle ? <MenuBarExtra.Item title={subtitle} icon={Icon.Music} /> : null}
        <MenuBarExtra.Item title={`State: ${state.timeline.state}`} icon={Icon.Play} />
      </MenuBarExtra.Section>
      {error ? (
        <MenuBarExtra.Section title="Error">
          <MenuBarExtra.Item title={error} icon={Icon.ExclamationMark} />
        </MenuBarExtra.Section>
      ) : null}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Now Playing"
          icon={Icon.AppWindow}
          onAction={() =>
            void launchCommand({
              name: "player-controls",
              type: LaunchType.UserInitiated,
            })
          }
        />
        <MenuBarExtra.Item title="Refresh" icon={Icon.ArrowClockwise} onAction={() => void reload()} />
        <MenuBarExtra.Item title="Open Extension Settings" icon={Icon.Gear} onAction={openExtensionPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
