import { Action, ActionPanel, Color, Detail, Icon, launchCommand, LaunchType } from "@raycast/api";
import { useEffect, useState } from "react";
import { pathToFileURL } from "node:url";
import { messageFor, withToast } from "../lib/command-ui";
import { countryName, favoriteId, rememberCity, removeFavorite, SkySelection, useLocations } from "../lib/locations";
import { getPreview, getSky, SkyRequest } from "../lib/skyfrom-api";
import { now, resolveTime, SkyTime, timeLabels } from "../lib/time";
import {
  CopyAction,
  DefaultCityAction,
  ExportActions,
  FavoriteForm,
  favoriteShortcut,
  SettingsAction,
  TimeActions,
  WallpaperAction,
} from "./selection-actions";

type LoadedSky = {
  sky: SkyRequest;
  colors: string[];
  local: string;
  preview?: string;
  warning?: string;
  stale: boolean;
};
type Preview = { kind: "loading" } | { kind: "ready"; data: LoadedSky } | { kind: "error"; error: unknown };

const previewSize = { width: 1120, height: 630 };

async function loadPreview(selection: SkySelection): Promise<LoadedSky> {
  const original = { city: selection.city, local: resolveTime(selection.time, selection.city) };
  const { value, stale } = await getSky(original);
  const sky = { city: selection.city, local: original.local ?? value.local };
  try {
    const image = await getPreview(sky, previewSize);
    return {
      sky,
      colors: value.colors,
      local: value.local,
      preview: pathToFileURL(image.path).href,
      stale: stale || image.stale,
    };
  } catch (error) {
    return { sky, colors: value.colors, local: value.local, warning: messageFor(error), stale };
  }
}

export function ExploreAction() {
  return (
    <Action
      icon={Icon.MagnifyingGlass}
      title="Explore Cities"
      onAction={() => launchCommand({ name: "explore-sky", type: LaunchType.UserInitiated })}
    />
  );
}

export function SkyDetail({ selection }: { selection: SkySelection }) {
  const [chosen, setChosen] = useState({ time: selection.time, revision: 0 });
  useEffect(() => {
    void rememberCity(selection.city).catch(() => undefined);
  }, [selection.city]);
  return (
    <SkyPreview
      key={chosen.revision}
      selection={{ city: selection.city, time: chosen.time }}
      onSelect={(time) => setChosen((value) => ({ time, revision: value.revision + 1 }))}
    />
  );
}

function SkyPreview({ selection, onSelect }: { selection: SkySelection; onSelect: (time: SkyTime) => void }) {
  const [view, setView] = useState<Preview>({ kind: "loading" });
  const favorites = useLocations().favorites;
  const id = favoriteId(selection);
  const favorite = favorites.find((item) => item.id === id);
  const city = selection.city;
  const data = view.kind === "ready" ? view.data : undefined;
  const event = selection.time.kind === "preset" ? timeLabels[selection.time.event] : undefined;
  useEffect(() => {
    let mounted = true;
    loadPreview(selection).then(
      (data) => {
        if (mounted) setView({ kind: "ready", data });
      },
      (error: unknown) => {
        if (mounted) setView({ kind: "error", error });
      },
    );
    return () => {
      mounted = false;
    };
  }, [selection]);

  const markdown =
    view.kind === "error" ? messageFor(view.error) : data?.preview ? `![Sky gradient](${data.preview})` : data?.warning;
  return (
    <Detail
      navigationTitle={`${city.name}, ${countryName(city)}`}
      isLoading={view.kind === "loading"}
      markdown={markdown}
      metadata={
        data && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Location" text={`${city.name}, ${countryName(city)}`} />
            <Detail.Metadata.Label title="Local Time" text={data.local.replace("T", " · ")} />
            {event ? <Detail.Metadata.Label title="Preset" text={event} /> : null}
            {data.stale ? (
              <Detail.Metadata.Label
                title="Preview"
                text="Cached"
                icon={{ source: Icon.Clock, tintColor: Color.Orange }}
              />
            ) : null}
            <Detail.Metadata.Separator />
            <Detail.Metadata.TagList title="Colors">
              {data.colors.map((color, index) => (
                <Detail.Metadata.TagList.Item
                  key={index}
                  text={color.toUpperCase()}
                  icon={{ source: Icon.CircleFilled, tintColor: color }}
                />
              ))}
            </Detail.Metadata.TagList>
            <Detail.Metadata.TagList title="Export Formats">
              {["CSS", "Tailwind", "SVG", "JSON", "Figma", "CSS Variables", "PNG"].map((format) => (
                <Detail.Metadata.TagList.Item key={format} text={format} />
              ))}
            </Detail.Metadata.TagList>
          </Detail.Metadata>
        )
      }
      actions={
        <ActionPanel>
          {data ? (
            <ActionPanel.Section>
              <CopyAction sky={data.sky} />
              <WallpaperAction sky={data.sky} />
            </ActionPanel.Section>
          ) : null}
          <ActionPanel.Section>
            <TimeActions selection={selection} onSelect={onSelect} />
            <Action
              title={selection.time.kind === "now" ? "Refresh Now" : "Return to Now"}
              icon={Icon.ArrowClockwise}
              onAction={() => onSelect(now)}
            />
            {view.kind === "error" && selection.time.kind !== "now" ? (
              <Action
                title="Retry Selected Time"
                icon={Icon.ArrowClockwise}
                onAction={() => onSelect(selection.time)}
              />
            ) : null}
          </ActionPanel.Section>
          {data ? <ExportActions sky={data.sky} /> : null}
          <ActionPanel.Section>
            {favorite ? (
              <Action
                title="Remove Favorite"
                icon={Icon.StarDisabled}
                shortcut={favoriteShortcut}
                onAction={() =>
                  withToast(
                    "Removing favorite…",
                    "Couldn’t remove favorite",
                    () => removeFavorite(id),
                    () => "Favorite removed",
                  )
                }
              />
            ) : (
              <Action.Push
                title="Add Favorite"
                icon={Icon.Star}
                shortcut={favoriteShortcut}
                target={<FavoriteForm selection={selection} />}
              />
            )}
            <DefaultCityAction city={city} />
            <ExploreAction />
            <SettingsAction />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
