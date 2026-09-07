import { environment } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { useRef } from "react";
import { GeoResult, formatPlace } from "../lib/api";
import { buildRadarGif } from "../lib/raster";
import { renderRadarCard, svgToMarkdown } from "../lib/svg";
import { escapeMarkdown } from "../lib/text";
import { HeroStyle } from "../lib/themes";
import {
  RAINVIEWER_MAPS_URL,
  RainViewerFrame,
  TILE_PX,
  basemapTileUrl,
  fetchTileGrid,
  frameWidthKm,
  isRainViewerMaps,
  radarGridFor,
  radarTileUrl,
  tileGrid,
  tilePoint,
  withHrefs,
} from "../lib/tiles";

/** Past observations + short nowcast in the animation loop. */
const PAST_FRAMES = 7;
const NOWCAST_FRAMES = 3;

export interface RadarData {
  markdown: string | undefined;
  /** Latest frame at full 840pt width, for the image share actions. */
  fullSvg: string | undefined;
  /** On-disk animated GIF, for the GIF share actions. */
  gifPath: string | undefined;
  /** Unix time of the latest observed radar frame. */
  frameTime: Date | undefined;
  /** Time span of the animation loop, e.g. "19:40 – 21:10". */
  loopRange: string | undefined;
  isLoading: boolean;
  /** Set when the pipeline failed and there is nothing to show. */
  error: Error | undefined;
  revalidate: () => void;
}

/** Whether a sky midtone is dark enough to warrant the dark basemap. */
function isDarkSky(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 128;
}

/** Wall-clock time in the place's timezone, falling back to the machine's. */
function hhmm(unix: number, timeZone: string | undefined): string {
  const d = new Date(unix * 1000);
  try {
    return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
  } catch {
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
}

/**
 * Animated radar loop (past hour + 30 min nowcast) composed over a basemap.
 * The GIF is written to the extension's support directory and embedded in
 * markdown; Raycast animates GIFs referenced by file path.
 *
 * Each pan/zoom starts a new pipeline (hundreds of tile fetches plus a GIF
 * encode), so the previous one is aborted rather than left to finish and race
 * the current one on disk.
 */
export function useRadar(
  place: GeoResult | undefined,
  center: { latitude: number; longitude: number },
  zoom: number,
  style: HeroStyle,
  displayWidth: number,
): RadarData {
  const abortable = useRef<AbortController | null>(null);

  const { data, isLoading, error, revalidate } = usePromise(
    // Colours are passed in (not read from `style`) so a theme change re-runs the pipeline.
    async (lat: number, lon: number, z: number, placeName: string, skyMid: string, accent: string, dw: number) => {
      const signal = abortable.current?.signal;
      const timeZone = place?.timezone;
      const dark = isDarkSky(skyMid);

      const mapsRes = await fetch(RAINVIEWER_MAPS_URL, { signal });
      if (!mapsRes.ok) throw new Error(`Radar index request failed (${mapsRes.status})`);
      const maps: unknown = await mapsRes.json();
      if (!isRainViewerMaps(maps)) throw new Error("Unexpected radar index response");
      const pastAll = maps.radar.past.slice(-PAST_FRAMES);
      // The public API currently returns no nowcast frames; handled as zero rather than assumed.
      const nowcast = maps.radar.nowcast.slice(0, NOWCAST_FRAMES);
      if (pastAll.length === 0) throw new Error("No radar frames available");
      const requested: RainViewerFrame[] = [...pastAll, ...nowcast];

      const grid = tileGrid(lat, lon, z);
      const rGrid = radarGridFor(grid);
      const [baseTilesRaw, ...radarFramesRaw] = await Promise.all([
        fetchTileGrid(
          (x, y) => basemapTileUrl(grid.zoom, x, y, dark),
          grid.tx0,
          grid.ty0,
          undefined,
          undefined,
          signal,
        ),
        ...requested.map((frame) =>
          fetchTileGrid(
            (x, y) => radarTileUrl(maps, frame, rGrid.zoom, x, y),
            rGrid.rx0,
            rGrid.ry0,
            rGrid.cols,
            rGrid.rows,
            signal,
          ),
        ),
      ]);
      signal?.throwIfAborted();
      if (baseTilesRaw.every((t) => !t.buf)) throw new Error("Could not load map tiles");

      // A frame with no tiles would play as a clean map, i.e. "the rain vanished";
      // drop it. If every frame is empty the radar layer itself failed, and a
      // rain-free map would be indistinguishable from a dry day, so say so.
      const loaded = requested
        .map((frame, i) => ({ frame, tiles: radarFramesRaw[i], isPast: i < pastAll.length }))
        .filter((f) => f.tiles.some((t) => t.buf));
      if (loaded.length === 0) throw new Error("Could not load radar tiles");
      const animFrames = loaded.map((f) => f.frame);
      const radarFrames = loaded.map((f) => f.tiles);
      const pastCount = loaded.filter((f) => f.isPast).length;
      const latestIdx = pastCount > 0 ? pastCount - 1 : loaded.length - 1;
      const latest = animFrames[latestIdx];

      // Only the static SVG card needs data: URIs; the GIF works from raw bytes.
      const baseTiles = withHrefs(baseTilesRaw);
      const latestTiles = withHrefs(radarFrames[latestIdx]);

      const frameTime = new Date(latest.time * 1000);
      const mp = place ? tilePoint(place.latitude, place.longitude, z) : undefined;
      const markerX = mp ? (mp.x - grid.tx0) * TILE_PX : undefined;
      const markerY = mp ? (mp.y - grid.ty0) * TILE_PX : undefined;
      const scaleLabel = `≈ ${frameWidthKm(lat, z)} km across`;

      // Latest frame as a static card: full-width for the share action,
      // panel-width as the fallback if GIF encoding fails.
      const card = {
        baseTiles,
        radarTiles: latestTiles,
        radarTilePx: rGrid.tilePx,
        radarOriginX: rGrid.originX,
        radarOriginY: rGrid.originY,
        px: grid.px,
        py: grid.py,
        markerX,
        markerY,
        place: placeName,
        timeLabel: `Radar · ${hhmm(latest.time, timeZone)}`,
        scaleLabel,
        style,
      };
      const fullSvg = renderRadarCard({ ...card, displayWidth: 840 });

      const loopRange = `${hhmm(animFrames[0].time, timeZone)} – ${hhmm(animFrames[animFrames.length - 1].time, timeZone)}`;
      let markdown: string;
      let gifPath: string | undefined;
      try {
        const gif = buildRadarGif({
          baseTiles,
          frames: radarFrames,
          pastCount,
          radarTilePx: rGrid.tilePx,
          radarOriginX: rGrid.originX,
          radarOriginY: rGrid.originY,
          px: grid.px,
          py: grid.py,
          markerX,
          markerY,
          accent,
          width: 840,
          height: 620,
        });
        // A superseded pipeline must not touch the disk: it would delete the
        // GIF the current view is about to display.
        signal?.throwIfAborted();
        const dir = join(environment.supportPath, "radar");
        mkdirSync(dir, { recursive: true });
        // Unique name per view state: Raycast caches markdown images by path.
        const name = `radar-${lat.toFixed(4)}_${lon.toFixed(4)}_z${z}_${dark ? "d" : "l"}_${latest.time}.gif`;
        for (const old of readdirSync(dir)) {
          if (old !== name) rmSync(join(dir, old), { force: true });
        }
        const path = join(dir, name);
        writeFileSync(path, Buffer.from(gif));
        gifPath = path;
        const dh = Math.round((dw * 620) / 840);
        const nowcastNote = pastCount < animFrames.length ? " · nowcast after the white notch" : "";
        markdown =
          `![Precipitation radar](${encodeURI(path)}?raycast-width=${dw}&raycast-height=${dh})\n\n` +
          `**${escapeMarkdown(placeName)}** · \`${loopRange}\`${nowcastNote} · ${scaleLabel}\n\n` +
          `*Map © Esri · © OpenStreetMap · Radar © RainViewer*`;
      } catch (error) {
        if (signal?.aborted) throw error;
        // Animation is best-effort; fall back to the static latest frame.
        markdown = svgToMarkdown(renderRadarCard({ ...card, displayWidth: dw }), "Precipitation radar");
      }

      return { markdown, fullSvg, gifPath, frameTime, loopRange };
    },
    [
      center.latitude,
      center.longitude,
      zoom,
      place ? formatPlace(place) : "",
      style.sky[1],
      style.accent,
      displayWidth,
    ],
    { execute: place !== undefined, abortable },
  );

  return {
    markdown: data?.markdown,
    fullSvg: data?.fullSvg,
    gifPath: data?.gifPath,
    frameTime: data?.frameTime,
    loopRange: data?.loopRange,
    isLoading,
    error: data ? undefined : error,
    revalidate,
  };
}
