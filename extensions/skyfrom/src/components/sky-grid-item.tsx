import { Action, ActionPanel, Grid, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { pathToFileURL } from "node:url";
import { withToast } from "../lib/command-ui";
import { countryName, favoriteId, removeFavorite, SkySelection, useAsDefault } from "../lib/locations";
import { cachedPNGPath, getPreview, SkyRequest, skyPage } from "../lib/skyfrom-api";
import { resolveTime, timeLabel } from "../lib/time";
import { CopyAction, DefaultCityAction, FavoriteForm, favoriteShortcut, WallpaperAction } from "./selection-actions";
import { SkyDetail } from "./sky-detail";

const thumbnailSize = { width: 400, height: 225 };

type Thumbnail = { kind: "loading" } | { kind: "unavailable" } | { kind: "ready"; path: string; stale: boolean };

export function SkyGridItem({
  selection,
  title,
  isFavorite = false,
}: {
  selection: SkySelection;
  title?: string;
  isFavorite?: boolean;
}) {
  const { city, time } = selection;
  const [image, setImage] = useState<Thumbnail>({ kind: "loading" });
  const [request, setRequest] = useState<SkyRequest>();
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const sky = { city, local: resolveTime(time, city) };
        if (active) setRequest(sky);
        const cached = await cachedPNGPath(sky, thumbnailSize);
        if (!active) return;
        if (cached) setImage({ kind: "ready", path: cached, stale: false });
        const result = await getPreview(sky, thumbnailSize);
        if (active) setImage({ kind: "ready", path: result.path, stale: result.stale });
      } catch {
        if (active) setImage({ kind: "unavailable" });
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [city, time]);

  const id = favoriteId(selection);
  const status =
    image.kind === "unavailable" ? " · Preview unavailable" : image.kind === "ready" && image.stale ? " · Cached" : "";
  return (
    <Grid.Item
      title={title ?? city.name}
      subtitle={`${countryName(city)} · ${timeLabel(time)}${status}`}
      content={image.kind === "ready" ? pathToFileURL(image.path).href : { color: "#333E4D" }}
      actions={
        <ActionPanel>
          <Action.Push title="Open Sky Details" icon={Icon.Eye} target={<SkyDetail selection={selection} />} />
          {request && image.kind !== "unavailable" ? <CopyAction sky={request} /> : null}
          {request && image.kind !== "unavailable" ? <WallpaperAction sky={request} /> : null}
          {isFavorite ? (
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
          {isFavorite ? (
            <Action
              title="Use Favorite as Default"
              icon={Icon.Pin}
              onAction={() =>
                withToast(
                  "Saving default…",
                  "Couldn’t save default",
                  () => useAsDefault({ kind: "favorite", id }),
                  () => "Default favorite saved",
                )
              }
            />
          ) : (
            <DefaultCityAction city={city} />
          )}
          {request ? <Action.OpenInBrowser title="Open in SkyFrom" url={skyPage(request)} /> : null}
        </ActionPanel>
      }
    />
  );
}
