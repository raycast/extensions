import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Icon,
  Image,
  List,
  closeMainWindow,
  getPreferenceValues,
  open,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import React, { useEffect, useMemo, useState } from "react";

import { useLatestDbUpdate, useServices } from "@/contexts/servicesContext";
import { DBSoundTile } from "@/types";
import { FARRAGO_FADE_DURATION_MS, ICLOUD_SHORTCUT_LINK } from "@/utils/constants";
import { applyShortcutTitleTemplate, formatDuration, getTileColorByIndex } from "@/utils/helpers";

export function SearchCommand() {
  const { dataSource } = useServices();
  const latestDbUpdate = useLatestDbUpdate();
  const [gridFilter, setGridFilter] = useState("");

  const tiles = useMemo(() => {
    const allTiles = dataSource.getAllTiles();

    if (!gridFilter) {
      return allTiles;
    }

    return allTiles?.filter((t) => t.set.uuid === gridFilter);
  }, [latestDbUpdate, gridFilter]);

  return (
    <List searchBarAccessory={<FilterBySetDropdown value={gridFilter} onChange={setGridFilter} />}>
      {tiles && tiles.length == 0 ? (
        <List.EmptyView
          title="No Sounds Found"
          description="Add some sets and tiles in Farrago, then call this command again."
          icon={{ source: "🤷🏻‍♂️" }}
        />
      ) : (
        tiles?.map((tile) => (
          <TileListItem
            key={tile.tileUUID}
            tile={tile}
            latestDbUpdate={latestDbUpdate}
            gridFilterExists={!!gridFilter}
          />
        ))
      )}
    </List>
  );
}

type TileListItemProps = { tile: DBSoundTile; latestDbUpdate: number | null; gridFilterExists: boolean };
const TileListItem = React.memo(
  ({ tile, latestDbUpdate, gridFilterExists }: TileListItemProps) => {
    const { dataSource, oscSender, oscReceiver } = useServices();

    const tileSet = dataSource.getSetByUuid(tile.set.uuid);
    const tileHasDuplicateTitles = dataSource.checkTileForDuplicateTitles(tile);

    const [playing, setPlaying] = useState(false);
    const [fading, setFading] = useState(false);
    const [remainingTimeFormatted, setRemainingTimeFormatted] = useState(formatDuration(tile.playerSettings.duration));

    useEffect(() => {
      if (oscReceiver.isClosed()) oscReceiver.open();

      const unsubscribePlaying = oscReceiver.subscribeToTileAction({
        tile,
        action: "currentTime",
        handler: (currentTime: number) => setPlaying(currentTime > 0),
      });

      const unsubscribeFading = oscReceiver.subscribeToTileAction({
        tile,
        action: "fadeOut",
        handler: (fading: boolean) => {
          if (fading) setFading(true);
        },
      });

      const unsubscribeRemainingTime = oscReceiver.subscribeToTileAction({
        tile,
        action: "remainingTime",
        handler: (remainingTime: number) => setRemainingTimeFormatted(formatDuration(remainingTime)),
      });

      return () => {
        unsubscribePlaying();
        unsubscribeFading();
        unsubscribeRemainingTime();
      };
    }, []);

    useEffect(() => {
      if (!fading) return;
      const timeout = setTimeout(() => setFading(false), FARRAGO_FADE_DURATION_MS);
      return () => clearTimeout(timeout);
    }, [fading]);

    const accessories = useMemo<List.Item.Accessory[]>(
      () => [{ text: remainingTimeFormatted, tooltip: "Duration" }],
      [latestDbUpdate, remainingTimeFormatted],
    );

    const playStopIcon = playing ? Icon.Stop : Icon.Play;

    const tileIcon: Image.ImageLike =
      fading && playing
        ? { source: Icon.SpeakerDown, tintColor: Color.SecondaryText }
        : playing
          ? {
              source: Icon.Stop,
              tintColor: Color.Red,
            }
          : {
              source: Icon.Play,
              tintColor: getTileColorByIndex(tile.colorIndex),
            };

    return (
      <List.Item
        title={{ value: tile.title + "  " + tile.tileIcon.join(" "), tooltip: tile.notes }}
        subtitle={{
          value:
            gridFilterExists || !tileHasDuplicateTitles
              ? ""
              : `${tileSet.title} • ${tile.gridPositionX},${tile.gridPositionY}`,
          tooltip: "Duplicate title, specifying set and position.",
        }}
        icon={tileIcon}
        accessories={accessories}
        actions={
          <ActionPanel>
            <ActionPanel.Section title="Playback">
              <Action
                title={playing ? "Stop" : "Play"}
                icon={playStopIcon}
                onAction={() => {
                  oscSender.runTileAction("play", tile);
                  closeMainWindow();
                }}
              />
              <Action
                title={`${playing ? "Stop" : "Play"} and Keep Window Open`}
                icon={playStopIcon}
                onAction={() => oscSender.runTileAction("play", tile)}
                shortcut={{ key: "enter", modifiers: ["opt"] }}
              />
              {playing ? (
                <Action
                  title="Fade"
                  icon={Icon.SpeakerDown}
                  onAction={() => oscSender.runTileAction("fadeOut", tile)}
                  shortcut={{ key: "f", modifiers: ["opt", "shift"] }}
                />
              ) : null}
              <Action
                title="Toggle AB Volume"
                icon={Icon.Speaker}
                onAction={() => oscSender.runTileAction("toggleAB", tile)}
                shortcut={{ key: "v", modifiers: ["opt", "shift"] }}
              />
            </ActionPanel.Section>
            <ActionPanel.Section title="Quickplay Shortcut">
              <Action.OpenInBrowser
                url={ICLOUD_SHORTCUT_LINK}
                icon={Icon.Link}
                title="Add Shortcut"
                shortcut={{ key: "s", modifiers: ["ctrl"] }}
              />
              <Action
                title="Copy Tile UUID"
                icon={Icon.CopyClipboard}
                onAction={() => {
                  Clipboard.copy(tile.tileUUID);
                  showToast({
                    title: `Copied Tile UUID for "${tile.title}"`,
                    primaryAction: {
                      title: "Add Shortcut",
                      onAction: () => open(ICLOUD_SHORTCUT_LINK),
                    },
                  });
                  oscReceiver.close(); // bad fix, but I can't think of another yet
                }}
                shortcut={{ key: "c", modifiers: ["cmd"] }}
              />
              <Action
                title="Copy Shortcut Title"
                icon={Icon.CopyClipboard}
                onAction={() => {
                  const formatted = applyShortcutTitleTemplate({
                    tile,
                    set: tileSet,
                    template: getPreferenceValues<Preferences>().shortcutTitleTemplate,
                  });
                  Clipboard.copy(formatted);
                  showToast({
                    title: `Copied Shortcut Title for "${tile.title}"`,
                    message: `Current formatting is "${formatted}". You can change it in the extension settings.`,
                    primaryAction: { title: "Open Extension Settings", onAction: openExtensionPreferences },
                  });
                  oscReceiver.close(); // bad fix, but I can't think of another yet
                }}
                shortcut={{ key: "c", modifiers: ["cmd", "shift"] }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  },
  (a, b) => a.latestDbUpdate === b.latestDbUpdate && a.gridFilterExists === b.gridFilterExists,
);

type FilterBySetDropdownProps = Pick<List.Dropdown.Props, "value" | "onChange">;
export function FilterBySetDropdown({ value, onChange }: FilterBySetDropdownProps) {
  const { dataSource } = useServices();
  const latestDbUpdate = useLatestDbUpdate();

  const sets = useMemo(() => {
    const allSets = dataSource.getAllSets();

    if (value && !allSets.find((s) => s.uuid === value)) {
      onChange?.("");
    }

    return allSets;
  }, [latestDbUpdate]);

  return (
    <List.Dropdown tooltip="Filter by Set" value={value} onChange={onChange}>
      <List.Dropdown.Item title="All Sets" value="" icon={Icon.Filter} />
      {sets.map((set) => (
        <List.Dropdown.Item
          key={set.uuid}
          title={set.title}
          value={set.uuid}
          icon={[Icon.AppWindowGrid3x3, Icon.List][set.mode]}
        />
      ))}
    </List.Dropdown>
  );
}
