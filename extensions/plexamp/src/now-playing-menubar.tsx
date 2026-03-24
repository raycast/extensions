import { Icon, LaunchType, MenuBarExtra, launchCommand, openExtensionPreferences } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";

import { formatNowPlayingMenuBarTitle } from "./format";
import { getImageUrl, getMetadataByKey, getMetadataByRatingKey, getTimeline } from "./plex";
import type { MetadataItem, TimelineInfo } from "./types";

interface MenuBarState {
  timeline: TimelineInfo;
  current?: MetadataItem;
  error?: string;
}

export default function Command() {
  const [state, setState] = useState<MenuBarState>({
    timeline: { state: "loading" },
  });
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const timeline = await getTimeline();
      let current: MetadataItem | undefined;

      if (timeline.key) {
        try {
          current = await getMetadataByKey(timeline.key);
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

      setState({ timeline, current });
    } catch (error) {
      setState({
        timeline: { state: "error" },
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const title = useMemo(() => formatNowPlayingMenuBarTitle(state.current), [state.current]);
  const icon = state.current?.thumb ? { source: getImageUrl(state.current.thumb) ?? Icon.Music } : Icon.Music;
  const subtitle =
    state.current?.type === "track"
      ? [state.current.parentTitle, state.current.grandparentTitle].filter(Boolean).join(" - ")
      : state.current?.type === "album"
        ? state.current.parentTitle
        : undefined;

  return (
    <MenuBarExtra isLoading={isLoading} icon={icon} title={title} tooltip={state.error ?? title}>
      <MenuBarExtra.Section title="Playback">
        <MenuBarExtra.Item title={title} icon={icon} />
        {subtitle ? <MenuBarExtra.Item title={subtitle} icon={Icon.Music} /> : null}
        <MenuBarExtra.Item title={`State: ${state.timeline.state}`} icon={Icon.Play} />
      </MenuBarExtra.Section>
      {state.error ? (
        <MenuBarExtra.Section title="Error">
          <MenuBarExtra.Item title={state.error} icon={Icon.ExclamationMark} />
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
